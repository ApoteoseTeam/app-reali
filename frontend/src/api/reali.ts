import type { Query, RequestOptions, Scope } from "./client";
import { ApiError, HttpClient } from "./client";

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type User = { id: number; email: string; full_name: string };
export type Tokens = { access: string; refresh: string };
export type Organization = { id: string; name: string; is_active: boolean };
export type School = { id: string; organization: string; name: string; code: string; is_active: boolean };
export type Member = { id: string; user: User; organization: string; role: string; is_active: boolean; all_schools_access: boolean; capabilities?: string[] };
export type ProfileUser = User & { profile_photo?: string };
export type ProfileUpdate = { full_name?: string; profile_photo?: string };
export type Me = { user: ProfileUser; memberships: Member[] };
export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
export type MealStatus = "PLANNED" | "PREPARING" | "SERVING" | "FINISHED" | "CANCELLED";
export type Metrics = {
  date?: string; school_id?: string; total_student_entries: number | null; total_forecast_plates: number | null;
  total_served_plates: number | null; forecast_difference: number | null; absolute_error: number | null;
  percentage_error: string | null; mae: string | null; wape: string | null; compared_services: number;
  data_status: string; calculated_at: string | null; stale: boolean | null; coverage: number; expected: number;
};
export type MealMetrics = Pick<Metrics, "total_forecast_plates" | "total_served_plates" | "forecast_difference"> & {
  id: string;
  reference_date: string;
  meal_type: MealType;
  status: MealStatus;
  snapshot_entries: number | null;
};
export type Dashboard = Metrics & { reference_date: string; meal_services: MealMetrics[]; meal_services_truncated: boolean };
export type Summary = { summary: Metrics; previous: Metrics; period: Range; previous_period: Range; comparison: Partial<Record<keyof Metrics, number | null>> };
export type Range = { start_date: string; end_date: string };
export type ChatStatus = "PENDING" | "COMPLETED" | "FAILED";
export type ChatSource = { ref: number; type: string; period: Range & { previous?: Range } };
export type Conversation = {
  id: string; school_id: string | null; title: string; status: "ACTIVE" | "ARCHIVED"; updated_at: string;
};
export type ConversationMessage = {
  id: string; role: "USER" | "ASSISTANT"; content: string; status: ChatStatus; sources: ChatSource[]; created_at: string;
};
export type ChatRequest = { conversation_id?: string; school_id?: string; client_request_id: string; message: string };
export type ChatResult = {
  conversation_id: string; message_id: string; status: ChatStatus; answer: string | null;
  sources: ChatSource[]; error: { code: string; message: string } | null;
};

export const mealTypes: Record<MealType, string> = { BREAKFAST: "Café da manhã", LUNCH: "Almoço", SNACK: "Lanche", DINNER: "Jantar" };
export const roleNames: Record<string, string> = { MANAGER: "Gestor", COOK: "Cozinha", NUTRITIONIST: "Nutrição", SECRETARIAT: "Secretaria" };

export class RealiApi {
  constructor(readonly http: HttpClient) {}
  async all<T>(first: () => Promise<Page<T>>, options: RequestOptions = {}) {
    let page = await first();
    const results = [...page.results];
    const visited = new Set<string>();
    while (page.next) {
      const path = this.http.next(page.next);
      if (visited.has(path)) throw new ApiError(0, "INVALID_PAGE", "Paginação inválida.");
      visited.add(path);
      page = await this.http.request<Page<T>>(path, options);
      results.push(...page.results);
    }
    return results;
  }

  login = (email: string, password: string) => this.http.request<Tokens & { user: User }>("auth/login/", {method:"POST", auth:false, body:{email,password}});
  me = (signal?: AbortSignal) => this.http.request<Me>("auth/me/", {signal});
  updateProfile = (body: ProfileUpdate) => this.http.request<ProfileUser>("auth/me/", {method:"PATCH", body});
  changePassword = (current_password: string, password: string, password_confirmation: string) =>
    this.http.request<void>("auth/change-password/", {method:"POST", body:{current_password,password,password_confirmation}});

  organizations = (signal?: AbortSignal) => this.all<Organization>(() => this.http.request("organizations/", {signal}), {signal});
  schools = (scope: Scope) => this.all<School>(() => this.http.request("auth/me/schools/", {scope}), {scope});
  dashboard = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Dashboard>("analytics/dashboard/", {scope,query,signal});
  summary = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Summary>("analytics/organizations/summary/", {scope,query,signal});
  mealMetrics = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Page<MealMetrics>>("analytics/meal-services/", {scope,query,signal});
  report = (scope: Scope, query: Query, file_format:"pdf"|"csv", signal?: AbortSignal) => this.http.request<ArrayBuffer>("analytics/reports/export/", {scope,signal,binary:true,timeout:30000,query:{...query,file_format}});
  conversations = (scope: Scope, signal: AbortSignal) => this.all(
    () => this.http.request<Page<Conversation>>("ai/conversations/", { scope, signal }), { scope, signal });
  conversationMessages = (scope: Scope, id: string, signal: AbortSignal) => this.all(
    () => this.http.request<Page<ConversationMessage>>(`ai/conversations/${encodeURIComponent(id)}/messages/`, { scope, signal }),
    { scope, signal });
  chat = async (scope: Scope, body: ChatRequest, signal: AbortSignal) => {
    try {
      return await this.http.request<ChatResult>("ai/chat/", { scope, signal, method: "POST", body, replay: true, timeout: 95000 });
    } catch (error) {
      // Falhas após a gravação do turno também trazem o resultado e o ID da conversa.
      const result = error instanceof ApiError ? error.data as Partial<ChatResult> | null : null;
      if (result?.status === "FAILED" && result.conversation_id && result.message_id) return result as ChatResult;
      throw error;
    }
  };
}
