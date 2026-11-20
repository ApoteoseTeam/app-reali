import type { Query, RequestOptions, Scope } from "./client";
import { ApiError, HttpClient } from "./client";

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type User = { id: number; email: string; full_name: string };
export type Tokens = { access: string; refresh: string };
export type Organization = { id: string; name: string; is_active: boolean };
export type School = { id: string; organization: string; name: string; code: string; is_active: boolean };
export type Member = { id: string; user: User; organization: string; role: string; is_active: boolean; all_schools_access: boolean; capabilities?: string[] };
export type Me = { user: User; memberships: Member[] };
export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
export type MealStatus = "PLANNED" | "PREPARING" | "SERVING" | "FINISHED" | "CANCELLED";
export type Meal = { id: string; school: string; date: string; meal_type: MealType; scheduled_time: string; status: MealStatus; serving_data_quality: string };
export type Schedule = { id: string; school: string; meal_type: MealType; start_time: string; end_time: string | null; weekdays: number[]; is_active: boolean };
export type Snapshot = { total_student_entries: number; reference_time: string; data_quality_status: string };
export type Forecast = { forecast_plates: number | null; method: string; confidence_status: string; calculated_at: string };
export type StartedMeal = Meal & { attendance_snapshot: Snapshot; forecast: Forecast };
export type Metrics = {
  date?: string; school_id?: string; total_student_entries: number | null; total_forecast_plates: number | null;
  total_served_plates: number | null; forecast_difference: number | null; absolute_error: number | null;
  percentage_error: string | null; mae: string | null; wape: string | null; compared_services: number;
  data_status: string; calculated_at: string | null; stale: boolean | null; coverage: number; expected: number;
};
export type MealMetrics = Omit<Metrics, "total_student_entries" | "data_status"> & { id: string; reference_date: string; meal_type: MealType; status: MealStatus; snapshot_entries: number | null; data_quality: string; forecast_method: string | null };
export type Dashboard = Metrics & { reference_date: string; meal_services: MealMetrics[]; meal_services_truncated: boolean };
export type Summary = { summary: Metrics; previous: Metrics; period: Range; previous_period: Range; comparison: Partial<Record<keyof Metrics, number | null>> };
export type Range = { start_date: string; end_date: string };
export type Camera = { id: string; school: string; name: string; camera_type: "ENTRANCE" | "CAFETERIA"; location: string; is_active: boolean; last_seen_at: string | null; operational_status: string; detector_status?: string | null; status_reason?: string | null; video_status?: string | null };
export type Point = {x:number;y:number};
export type CameraParameters = {
  event_kind:"STUDENT_ENTRY"|"PLATE_DELIVERY";
  trigger:"LINE_CROSSING"|"DELIVERY_ZONE";
  desired_fps:number;
  confidence_threshold:number;
  algorithm_version:string;
  region_of_interest?:{top_left:Point;bottom_right:Point};
  counting_line?:{start:Point;end:Point;direction:"NEGATIVE_TO_POSITIVE"|"POSITIVE_TO_NEGATIVE"};
  tracker?:{track_buffer_frames:number;match_threshold:number};
};
export type CameraConfiguration = {version:number;updated_at:string;parameters:CameraParameters};
export type CameraEvent = { id: string; occurred_at: string; event_type: string; new_status?: string; reason?: string; message?: string };
export type Count = { id: string; camera: string; meal_service?: string; quantity: number; recorded_at: string };
export type CountsSummary = { student_entries?: number; served_plates?: number; last_updated: string | null; last_source_event_at: string | null; automatic: number; adjustment: number };
export type Invite = { id: string; email: string; role: string; status: string; expires_at: string; school_ids: string[]; all_schools_access: boolean; delivery_status: string };
export type Grant = { school_ids: string[]; all_schools_access: boolean };
export type Conversation = { id: string; school_id: string | null; title: string; status: "ACTIVE" | "ARCHIVED"; last_message_at: string | null };
export type Source = { ref: number; type: string; school_id: string | null; period: Range & { previous?: Range }; rows: { data_status?: string; stale?: boolean }[] };
export type ChatMessage = { id: string; role: "USER" | "ASSISTANT"; status: "PENDING" | "FAILED" | "COMPLETED"; content: string; sources: Source[]; error_code: string };
export type ChatInput = { conversation_id: string; school_id?: string; client_request_id: string; message: string };
export type ChatOutput = { conversation_id: string; message_id: string; answer: string | null; sources: Source[]; status: ChatMessage["status"]; error: {code: string; message: string} | null };
export type Group = "daily" | "weekly" | "monthly";
export type Notice = {
  id: string; organization: string; school: string | null; school_name: string | null;
  notification_type: string; type_label: string; title: string; message: string; priority: string;
  data: { resource?: string; resource_id?: string }; created_at: string;
  read_at: string | null; archived_at: string | null;
};
export type NoticePreference = {
  notification_type: string; label: string; in_app: boolean; push: boolean; email: boolean;
  required_in_app: boolean; push_available: boolean; email_available: boolean;
};
export type NoticeChannel = "in_app" | "push" | "email";
export type PushRegistration = {
  installation: string; installation_secret: string; push_token: string; platform: "ANDROID" | "IOS";
};

export const mealTypes: Record<MealType, string> = { BREAKFAST: "Café da manhã", LUNCH: "Almoço", SNACK: "Lanche", DINNER: "Jantar" };
export const mealStatuses: Record<MealStatus, string> = { PLANNED: "Planejado", PREPARING: "Em preparo", SERVING: "Em distribuição", FINISHED: "Finalizado", CANCELLED: "Cancelado" };
export const roleNames: Record<string, string> = { DIRECTOR: "Direção", ADMIN: "Administração", MANAGER: "Gestão", COOK: "Cozinha", NUTRITIONIST: "Nutrição", TEACHER: "Docência", SECRETARIAT: "Secretaria" };

export function objectId(value:string){
  if(typeof value!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new ApiError(400,"INVALID_ID","Identificador inválido.");
  return value;
}

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
  profile = (full_name: string) => this.http.request<User>("auth/me/", {method:"PATCH", body:{full_name}});
  changePassword = (body: {current_password: string; password: string; password_confirmation: string}) => this.http.request<void>("auth/change-password/", {method:"POST", body});
  resetRequest = (email: string) => this.http.request<{message: string}>("auth/password-reset/request/", {auth:false, method:"POST", body:{email}});
  verifyInvite = (token: string, signal?: AbortSignal) => this.http.request<{valid:boolean}>("auth/invitations/verify/", {auth:false, method:"POST", body:{token}, signal});
  activate = (body: {token:string;full_name?:string;password?:string;password_confirmation?:string}, authenticated: boolean) => this.http.request<{message:string}>("auth/invitations/activate/", {auth:authenticated, method:"POST", body});
  resetConfirm = (body:{token:string;password:string;password_confirmation:string}) => this.http.request<void>("auth/password-reset/confirm/", {auth:false,method:"POST",body});

  organizations = (signal?: AbortSignal) => this.all<Organization>(() => this.http.request("organizations/", {signal}), {signal});
  schools = (scope: Scope) => this.all<School>(() => this.http.request("auth/me/schools/", {scope}), {scope});
  notices = (scope:Scope, query:Query, signal?:AbortSignal) => this.http.request<Page<Notice>>("notifications/", {scope,query,signal});
  notice = (scope:Scope, school_id:string, id:string, signal?:AbortSignal) =>
    this.http.request<Notice>(`notifications/${objectId(id)}/`, {scope,query:{school_id},signal});
  unreadNotices = (scope:Scope, school_id:string, signal?:AbortSignal) =>
    this.http.request<{unread_count:number}>("notifications/unread-count/", {scope,query:{school_id},signal});
  updateNotice = (scope:Scope, school_id:string, id:string, action:"read"|"archive") =>
    this.http.request<Notice>(`notifications/${objectId(id)}/${action}/`, {scope,query:{school_id},method:"POST",replay:true});
  readAllNotices = (scope:Scope, school_id:string) =>
    this.http.request<{updated:number}>("notifications/read-all/", {scope,query:{school_id},method:"POST",replay:true});
  noticePreferences = (scope:Scope, signal?:AbortSignal) =>
    this.http.request<NoticePreference[]>("notifications/preferences/", {scope,signal});
  setNoticePreference = (scope:Scope, notification_type:string, channel:NoticeChannel, value:boolean) =>
    this.http.request<NoticePreference>("notifications/preferences/", {scope,method:"PATCH",body:{notification_type,[channel]:value},replay:true});
  registerPush = (body:PushRegistration, signal?:AbortSignal) =>
    this.http.request<{id:string}>("notifications/push-devices/", {method:"POST",body,signal,replay:true});
  revokePush = (id:string, signal?:AbortSignal) =>
    this.http.request<void>(`notifications/push-devices/${objectId(id)}/`, {method:"DELETE",signal,replay:true});
  dashboard = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Dashboard>("analytics/dashboard/", {scope,query,signal});
  history = (scope: Scope, group: Group, query: Query, signal?: AbortSignal) => this.http.request<Page<Metrics>>("analytics/history/" + group + "/", {scope,query,signal});
  summary = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Summary>("analytics/organizations/summary/", {scope,query,signal});
  comparison = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Page<Metrics>>("analytics/schools/comparison/", {scope,query,signal});
  mealMetric = (scope:Scope,id:string,signal?:AbortSignal) => this.http.request<MealMetrics>(`analytics/meal-services/${objectId(id)}/`,{scope,signal});
  mealMetrics = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Page<MealMetrics>>("analytics/meal-services/", {scope,query,signal});
  report = (scope: Scope, query: Query, file_format:"pdf"|"csv") => this.http.request<ArrayBuffer>("analytics/reports/export/", {scope,binary:true,timeout:30000,query:{...query,file_format}});

  meals = (scope: Scope, query: Query, signal?: AbortSignal) => this.http.request<Page<Meal>>("meal-services/", {scope,query,signal});
  meal = (scope: Scope,id:string,signal?:AbortSignal) => this.http.request<Meal>(`meal-services/${objectId(id)}/`, {scope,signal});
  forecasts = (scope: Scope,id:string,signal?:AbortSignal) => this.http.request<Forecast>(`meal-services/${objectId(id)}/forecast/`, {scope,signal});
  snapshot = (scope: Scope,id:string,signal?:AbortSignal) => this.http.request<Snapshot>(`meal-services/${objectId(id)}/attendance-snapshot/`, {scope,signal});
  start = (scope:Scope,id:string) => this.http.request<StartedMeal>(`meal-services/${objectId(id)}/start/`,{scope,method:"POST",body:{}});
  transition = (scope: Scope,id:string, action:"start-serving"|"finish"|"cancel", reason?:string) => this.http.request<Meal>(`meal-services/${objectId(id)}/${action}/`,{scope,method:"POST",body:reason?{reason}:{}});
  createMeal = (scope:Scope, body:{school:string; date:string; scheduled_time:string; meal_type:MealType}) => this.http.request<Meal>("meal-services/",{scope,method:"POST",body});
  schedules = (scope:Scope,query:Query,signal?:AbortSignal) => this.http.request<Page<Schedule>>("meal-schedules/",{scope,query,signal});
  generateMeal = (scope:Scope,id:string,date:string) => this.http.request<Meal>(`meal-schedules/${objectId(id)}/generate/`,{scope,method:"POST",body:{date}});
  createSchedule = (scope:Scope, body:{school:string; weekdays:number[];start_time:string;meal_type:MealType}) => this.http.request<Schedule>("meal-schedules/",{scope,method:"POST",body});

  cameras = (scope: Scope,query: Query,signal?:AbortSignal) => this.http.request<Page<Camera>>("cameras/",{scope,query,signal});
  cameraStatus = (scope:Scope,id:string,signal?:AbortSignal) => this.http.request<Camera>(`cameras/${objectId(id)}/status/`,{scope,signal});
  cameraHistory = (scope:Scope,id:string,signal?:AbortSignal,page=1) => this.http.request<Page<CameraEvent>>(`cameras/${objectId(id)}/health-history/`,{scope,signal,query:{page}});
  cameraConfig = (scope:Scope,id:string,signal?:AbortSignal) => this.http.request<CameraConfiguration>(`cameras/${objectId(id)}/configuration/`,{scope,signal});
  saveCameraConfig = (scope:Scope,id:string,body:CameraParameters) => this.http.request<CameraConfiguration>(`cameras/${objectId(id)}/configuration/`,{scope,method:"PUT",body});
  cameraEdit = (scope:Scope,id:string,body:{name:string;location:string}) => this.http.request<Camera>(`cameras/${objectId(id)}/`,{scope,method:"PATCH",body});
  cameraActive = (scope:Scope,id:string,active:boolean) => this.http.request<Camera>(`cameras/${objectId(id)}/${active?"activate":"deactivate"}/`,{scope,method:"POST"});
  counts = (scope:Scope,kind:"student"|"plate",query:Query,signal?:AbortSignal) => this.http.request<Page<Count>>(`${kind}-counts/`,{scope,query,signal});
  countSummary = (scope:Scope,kind:"student"|"plate",query:Query,signal?:AbortSignal) => this.http.request<CountsSummary>(`${kind}-counts/summary/`,{scope,query,signal});
  adjustCount = (scope:Scope,body:{event_type:"STUDENT_ENTRY"|"PLATE_SERVED";count_id:string;delta:number;reason:string},key?:string) =>
    this.http.request("count-adjustments/",{scope,method:"POST",body,replay:Boolean(key),idempotencyKey:key&&objectId(key)});

  employees = (scope:Scope,query:Query,signal?:AbortSignal) => this.http.request<Page<Member>>("memberships/",{scope,query,signal});
  employee = (scope:Scope,id:string,signal?:AbortSignal) => this.http.request<Member>(`memberships/${objectId(id)}/`,{scope,signal});
  grant = (scope:Scope,id:string,signal?:AbortSignal) => this.http.request<Grant>(`memberships/${objectId(id)}/schools/`,{scope,signal});
  saveGrant = (scope:Scope,id:string,body:Grant) => this.http.request<Grant>(`memberships/${objectId(id)}/schools/`,{scope,method:"PUT",body});
  employeeRole = (scope:Scope,id:string,role:string) => this.http.request<Member>(`memberships/${objectId(id)}/`,{scope,method:"PATCH",body:{role}});
  employeeActive = (scope:Scope,id:string,active:boolean) => this.http.request<Member>(`memberships/${objectId(id)}/${active?"reactivate":"deactivate"}/`,{scope,method:"POST"});
  invites = (scope:Scope,signal?:AbortSignal) => this.http.request<Invite[]>("invitations/",{scope,signal});
  invite = (scope:Scope,body:Grant&{email:string;role:string}) => this.http.request<Invite>("invitations/",{scope,method:"POST",body});
  inviteAction = (scope:Scope,id:string,action:"resend"|"revoke") => this.http.request<Invite>(`invitations/${objectId(id)}/${action}/`,{scope,method:"POST"});

  conversations = (scope:Scope,signal?:AbortSignal,page=1) => this.http.request<Page<Conversation>>("ai/conversations/",{scope,signal,query:{page}});
  conversation = (scope:Scope,id:string,signal?:AbortSignal) => this.http.request<Conversation>(`ai/conversations/${objectId(id)}/`,{scope,signal});
  createConversation = (scope:Scope,school_id:string,title?:string) => this.http.request<Conversation>("ai/conversations/",{scope,method:"POST",body:{school_id,title}});
  conversationStatus = (scope:Scope,id:string,status:Conversation["status"]) => this.http.request<Conversation>(`ai/conversations/${objectId(id)}/`,{scope,method:"PATCH",body:{status}});
  deleteConversation = (scope:Scope,id:string) => this.http.request<void>(`ai/conversations/${objectId(id)}/`,{scope,method:"DELETE"});
  messages = (scope:Scope,id:string,signal?:AbortSignal,page=1) => this.http.request<Page<ChatMessage>>(`ai/conversations/${objectId(id)}/messages/`,{scope,signal,query:{page}});
  chat = (scope:Scope,body:ChatInput) => this.http.request<ChatOutput>("ai/chat/",{scope,method:"POST",body,replay:true,timeout:100000});
  next = <T>(scope:Scope, url:string,signal?:AbortSignal) => this.http.request<Page<T>>(this.http.next(url),{scope,signal});
}
