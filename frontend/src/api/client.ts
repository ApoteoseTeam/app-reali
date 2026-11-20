export type Query = Record<string, string | number | boolean | null | undefined>;
export type Scope = { organization: string; signal?: AbortSignal };
export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  auth?: boolean;
  scope?: Scope;
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number;
  replay?: boolean;
  binary?: boolean;
  idempotencyKey?: string;
};

const messages: Record<number, string> = {
  400: "Confira os dados informados.", 401: "Entre novamente para continuar.",
  403: "Seu acesso atual não permite esta operação.", 404: "O recurso solicitado está indisponível.",
  409: "O registro mudou ou outra operação está em andamento.", 422: "Confira os dados da operação.",
  429: "Limite de solicitações atingido. Aguarde e tente novamente.", 500: "O servidor encontrou uma falha.",
  502: "O serviço está temporariamente indisponível.", 503: "O serviço está temporariamente indisponível.",
  504: "O serviço demorou a responder.",
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    public data: unknown = null,
    public retryAfter: string | null = null,
  ) { super(message); this.name = "ApiError"; }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function messageText(value: unknown): string | undefined {
  if (typeof value === "string" && value.length <= 400 && !/[<>]/.test(value)) return value;
  return Array.isArray(value) ? value.map(item => typeof item === "string" ? messageText(item) : undefined).filter(Boolean).join(" ") || undefined : undefined;
}

function problem(status: number, value: unknown, retryAfter: string | null) {
  const json = record(value);
  const error = record(json.error);
  const detail = record(json.detail);
  const code = [error.code, json.code, detail.code].find(item => typeof item === "string");
  const fields: Record<string, string> = {};
  if (status === 400 || status === 422) {
    for (const [key, item] of Object.entries(json)) {
      const text = messageText(item);
      if (text && !["code", "detail", "message", "error"].includes(key)) fields[key] = text;
    }
  }
  const serverText = status < 500 || typeof error.code === "string"
    ? [error.message, detail.detail, json.detail, json.message, ...Object.values(fields)].map(messageText).find(Boolean)
    : undefined;
  return new ApiError(status, typeof code === "string" ? code : "HTTP_ERROR",
    serverText || messages[status] || "A solicitação não pôde ser concluída.", fields, value, retryAfter);
}

export function apiBase(value: string | undefined, development: boolean) {
  try {
    const parsed = new URL(value?.trim() ?? "");
    if ((!development && parsed.protocol !== "https:") || !["http:", "https:"].includes(parsed.protocol)
      || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.replace(/\/+$/, "").endsWith("/api/v1")) {
      throw new Error();
    }
    return parsed.href.replace(/\/+$/, "");
  } catch {
    throw new ApiError(0, "CONFIGURATION", "Configure a URL da API terminada em /api/v1. Builds publicados exigem HTTPS.");
  }
}

export type Credentials = { access: string | null; generation: number };
export type AuthAdapter = { credentials(): Credentials; refresh(observed: Credentials): Promise<void> };

export class HttpClient {
  constructor(
    private readonly getBase: () => string,
    private readonly auth: AuthAdapter,
    private readonly network: typeof fetch = fetch,
  ) {}

  next(value: string) {
    const base = new URL(this.getBase());
    const next = new URL(value, base.href + "/");
    if (next.origin !== base.origin || !next.pathname.startsWith(base.pathname + "/") || next.username || next.password || next.hash) {
      throw new ApiError(0, "INVALID_PAGE", "O endereço da próxima página é inválido.");
    }
    return next.pathname.slice(base.pathname.length + 1) + next.search;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { auth = true, method = "GET" } = options;
    const original = this.auth.credentials();
    if (auth && !original.access) throw new ApiError(401, "NO_SESSION", messages[401]);
    try {
      return await this.send<T>(path, options, original, method);
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status !== 401 || !auth) throw cause;
      if(cause.code==="login_required")throw cause;
      this.check(original, options);
      await this.auth.refresh(original);
      this.check(original, options);
      if (method !== "GET" && !options.replay) {
        throw new ApiError(401, "RETRY_AFTER_REFRESH", "Sessão renovada. Confirme a operação novamente.");
      }
      return this.send<T>(path, options, this.auth.credentials(), method);
    }
  }

  private check(observed: Credentials, options: RequestOptions) {
    if (options.signal?.aborted || options.scope?.signal?.aborted || (options.auth !== false && observed.generation !== this.auth.credentials().generation)) {
      throw new ApiError(0, "CANCELLED", "Solicitação cancelada.");
    }
  }

  private async send<T>(path: string, options: RequestOptions, credentials: Credentials, method: string): Promise<T> {
    this.check(credentials, options);
    const base = this.getBase();
    if (!/^[a-z0-9]/i.test(path) || path.includes("\\") || path.includes("#")) throw new ApiError(0, "INVALID_PATH", "Endereço inválido.");
    const url = new URL(path, base + "/");
    if (!url.href.startsWith(base + "/")) throw new ApiError(0, "INVALID_PATH", "Endereço inválido.");
    for (const [key, value] of Object.entries(options.query ?? {})) if (value != null) url.searchParams.set(key, String(value));
    const controller = new AbortController();
    const cancel = () => controller.abort();
    const signals = [options.signal, options.scope?.signal].filter((signal): signal is AbortSignal => Boolean(signal));
    signals.forEach(signal => signal.addEventListener("abort", cancel, { once: true }));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeout ?? 12000);
    const headers: Record<string, string> = { Accept: options.binary ? "application/pdf, text/csv, application/json" : "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
    if (options.auth !== false && credentials.access) headers.Authorization = "Bearer " + credentials.access;
    if (options.scope) headers["X-Organization-ID"] = options.scope.organization;
    try {
      const response = await this.network(url.href, { method, headers, redirect: "error", signal: controller.signal,
        body: options.body === undefined ? undefined : JSON.stringify(options.body) });
      this.check(credentials, options);
      if (!response.ok) {
        const data = response.headers.get("content-type")?.includes("json") ? await response.json().catch(() => null) : null;
        this.check(credentials, options);
        throw problem(response.status, data, response.headers.get("Retry-After"));
      }
      const mime=response.headers.get("content-type")??"";
      if(response.status!==204&&!(options.binary?/^(application\/pdf|text\/csv)(?:;|$)/i.test(mime):mime.includes("json"))){
        throw new ApiError(response.status,"INVALID_RESPONSE","O servidor retornou um formato inesperado.");
      }
      const contents = response.status === 204 ? undefined : options.binary ? await response.arrayBuffer() : await response.json();
      this.check(credentials, options);
      if (timedOut) throw new ApiError(0, "TIMEOUT", "A solicitação demorou a responder. Tente novamente.");
      return contents as T;
    } catch (cause) {
      this.check(credentials, options);
      if (cause instanceof ApiError) throw cause;
      throw new ApiError(0, timedOut ? "TIMEOUT" : "OFFLINE",
        timedOut ? "A solicitação demorou a responder. Tente novamente." : "Sem conexão com o Reali. Verifique sua rede e tente novamente.");
    } finally {
      clearTimeout(timer);
      signals.forEach(signal => signal.removeEventListener("abort", cancel));
    }
  }
}
