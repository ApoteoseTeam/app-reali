import { ApiError, type AuthAdapter, type Credentials, HttpClient } from "../api/client";
import type { Tokens } from "../api/reali";

export type Vault = { read(): Promise<string | null>; write(value: string | null): Promise<void> };
export type Expired = "SESSION_EXPIRED" | "ACCOUNT_DISABLED";

export class SessionTokens implements AuthAdapter {
  private access: string | null = null;
  private secret: string | null = null;
  private generation = 0;
  private writing = Promise.resolve();
  private flight: Promise<void> | null = null;
  private http: HttpClient | null = null;
  onExpired?: (state: Expired) => void;

  constructor(private readonly vault: Vault) {}
  attach(http: HttpClient) { this.http = http; }
  credentials = (): Credentials => ({access:this.access,generation:this.generation});
  private persist(value: string | null) {
    const write = this.writing.catch(() => undefined).then(() => this.vault.write(value));
    this.writing = write;
    return write;
  }
  async accept(tokens: Tokens, generation: number) {
    if (this.generation !== generation) throw new ApiError(0,"CANCELLED","Solicitação cancelada.");
    if (!tokens.access || !tokens.refresh) throw new ApiError(0,"INVALID_SESSION","A API não retornou uma sessão válida.");
    try { await this.persist(tokens.refresh); }
    catch {
      if (this.generation === generation) this.clear();
      throw new ApiError(0,"SECURE_STORAGE","O armazenamento seguro está indisponível.");
    }
    if (this.generation !== generation) throw new ApiError(0,"CANCELLED","Solicitação cancelada.");
    this.access = tokens.access;
    this.secret = tokens.refresh;
  }
  async restore() {
    const generation = this.generation;
    const secret = await this.vault.read();
    if (this.generation !== generation || !secret) return false;
    this.secret = secret;
    await this.refresh(this.credentials());
    return Boolean(this.access);
  }
  reset() {
    this.generation++;
    this.access = null;
    const previous = this.secret;
    this.secret = null;
    this.flight = null;
    return {previous, persisted:this.persist(null)};
  }
  clear() { void this.reset().persisted.catch(() => undefined); }
  async logout() {
    // Wait for in-flight rotation to settle before choosing the last refresh token.
    const flight = this.flight;
    if (flight) await flight.catch(() => undefined);
    const {previous, persisted} = this.reset();
    const revocation = previous ? this.http?.request<void>("auth/logout/",{auth:false,method:"POST",body:{refresh:previous}}) : undefined;
    const [local, remote] = await Promise.allSettled([persisted, revocation]);
    if (local.status === "rejected") {
      throw new ApiError(0, "SECURE_STORAGE", "O armazenamento seguro não confirmou a remoção da sessão.");
    }
    if (remote.status === "rejected") {
      const error = remote.reason;
      if (!(error instanceof ApiError) || ![400,401].includes(error.status)) throw error;
    }
  }
  async refresh(observed: Credentials) {
    if (observed.generation !== this.generation) throw new ApiError(0,"CANCELLED","Solicitação cancelada.");
    if (observed.access && this.access && observed.access !== this.access) return;
    if (this.flight) return this.flight;
    if (!this.secret || !this.http) {
      this.expire("SESSION_EXPIRED");
      throw new ApiError(401,"NO_SESSION","Sessão expirada.");
    }
    const secret = this.secret;
    const task = this.http.request<Tokens>("auth/refresh/",{auth:false,method:"POST",body:{refresh:secret}})
      .then(tokens => this.accept(tokens,observed.generation))
      .catch(error => {
        if (error instanceof ApiError && [400,401,403].includes(error.status) && observed.generation === this.generation) {
          this.expire(error.code === "no_active_account" || error.code === "user_inactive" ? "ACCOUNT_DISABLED":"SESSION_EXPIRED");
        }
        throw error;
      })
      .finally(() => { if (this.flight === task) this.flight = null; });
    this.flight = task;
    await task;
  }
  private expire(state: Expired) {
    this.clear();
    this.onExpired?.(state);
  }
}
