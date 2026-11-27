"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealiApi = exports.roleNames = exports.mealStatuses = exports.mealTypes = void 0;
exports.objectId = objectId;
const client_1 = require("./client");
exports.mealTypes = { BREAKFAST: "Café da manhã", LUNCH: "Almoço", SNACK: "Lanche", DINNER: "Jantar" };
exports.mealStatuses = { PLANNED: "Planejado", PREPARING: "Em preparo", SERVING: "Em distribuição", FINISHED: "Finalizado", CANCELLED: "Cancelado" };
exports.roleNames = { MANAGER: "Gestor", COOK: "Cozinha", NUTRITIONIST: "Nutrição", SECRETARIAT: "Secretaria" };
function objectId(value) {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
        throw new client_1.ApiError(400, "INVALID_ID", "Identificador inválido.");
    return value;
}
class RealiApi {
    http;
    constructor(http) {
        this.http = http;
    }
    async all(first, options = {}) {
        let page = await first();
        const results = [...page.results];
        const visited = new Set();
        while (page.next) {
            const path = this.http.next(page.next);
            if (visited.has(path))
                throw new client_1.ApiError(0, "INVALID_PAGE", "Paginação inválida.");
            visited.add(path);
            page = await this.http.request(path, options);
            results.push(...page.results);
        }
        return results;
    }
    login = (email, password) => this.http.request("auth/login/", { method: "POST", auth: false, body: { email, password } });
    me = (signal) => this.http.request("auth/me/", { signal });
    profile = (full_name) => this.http.request("auth/me/", { method: "PATCH", body: { full_name } });
    changePassword = (body) => this.http.request("auth/change-password/", { method: "POST", body });
    resetRequest = (email) => this.http.request("auth/password-reset/request/", { auth: false, method: "POST", body: { email } });
    verifyInvite = (token, signal) => this.http.request("auth/invitations/verify/", { auth: false, method: "POST", body: { token }, signal });
    activate = (body, authenticated) => this.http.request("auth/invitations/activate/", { auth: authenticated, method: "POST", body });
    resetConfirm = (body) => this.http.request("auth/password-reset/confirm/", { auth: false, method: "POST", body });
    organizations = (signal) => this.all(() => this.http.request("organizations/", { signal }), { signal });
    schools = (scope) => this.all(() => this.http.request("auth/me/schools/", { scope }), { scope });
    notices = (scope, query, signal) => this.http.request("notifications/", { scope, query, signal });
    notice = (scope, school_id, id, signal) => this.http.request(`notifications/${objectId(id)}/`, { scope, query: { school_id }, signal });
    unreadNotices = (scope, school_id, signal) => this.http.request("notifications/unread-count/", { scope, query: { school_id }, signal });
    updateNotice = (scope, school_id, id, action) => this.http.request(`notifications/${objectId(id)}/${action}/`, { scope, query: { school_id }, method: "POST", replay: true });
    readAllNotices = (scope, school_id) => this.http.request("notifications/read-all/", { scope, query: { school_id }, method: "POST", replay: true });
    noticePreferences = (scope, signal) => this.http.request("notifications/preferences/", { scope, signal });
    setNoticePreference = (scope, notification_type, channel, value) => this.http.request("notifications/preferences/", { scope, method: "PATCH", body: { notification_type, [channel]: value }, replay: true });
    registerPush = (body, signal) => this.http.request("notifications/push-devices/", { method: "POST", body, signal, replay: true });
    revokePush = (id, signal) => this.http.request(`notifications/push-devices/${objectId(id)}/`, { method: "DELETE", signal, replay: true });
    dashboard = (scope, query, signal) => this.http.request("analytics/dashboard/", { scope, query, signal });
    history = (scope, group, query, signal) => this.http.request("analytics/history/" + group + "/", { scope, query, signal });
    summary = (scope, query, signal) => this.http.request("analytics/organizations/summary/", { scope, query, signal });
    comparison = (scope, query, signal) => this.http.request("analytics/schools/comparison/", { scope, query, signal });
    mealMetric = (scope, id, signal) => this.http.request(`analytics/meal-services/${objectId(id)}/`, { scope, signal });
    mealMetrics = (scope, query, signal) => this.http.request("analytics/meal-services/", { scope, query, signal });
    report = (scope, query, file_format, signal) => this.http.request("analytics/reports/export/", { scope, signal, binary: true, timeout: 30000, query: { ...query, file_format } });
    meals = (scope, query, signal) => this.http.request("meal-services/", { scope, query, signal });
    meal = (scope, id, signal) => this.http.request(`meal-services/${objectId(id)}/`, { scope, signal });
    forecasts = (scope, id, signal) => this.http.request(`meal-services/${objectId(id)}/forecast/`, { scope, signal });
    snapshot = (scope, id, signal) => this.http.request(`meal-services/${objectId(id)}/attendance-snapshot/`, { scope, signal });
    start = (scope, id) => this.http.request(`meal-services/${objectId(id)}/start/`, { scope, method: "POST", body: {} });
    transition = (scope, id, action, reason) => this.http.request(`meal-services/${objectId(id)}/${action}/`, { scope, method: "POST", body: reason ? { reason } : {} });
    createMeal = (scope, body) => this.http.request("meal-services/", { scope, method: "POST", body });
    schedules = (scope, query, signal) => this.http.request("meal-schedules/", { scope, query, signal });
    generateMeal = (scope, id, date) => this.http.request(`meal-schedules/${objectId(id)}/generate/`, { scope, method: "POST", body: { date } });
    createSchedule = (scope, body) => this.http.request("meal-schedules/", { scope, method: "POST", body });
    cameras = (scope, query, signal) => this.http.request("cameras/", { scope, query, signal });
    cameraStatus = (scope, id, signal) => this.http.request(`cameras/${objectId(id)}/status/`, { scope, signal });
    cameraHistory = (scope, id, signal, page = 1) => this.http.request(`cameras/${objectId(id)}/health-history/`, { scope, signal, query: { page } });
    cameraConfig = (scope, id, signal) => this.http.request(`cameras/${objectId(id)}/configuration/`, { scope, signal });
    saveCameraConfig = (scope, id, body) => this.http.request(`cameras/${objectId(id)}/configuration/`, { scope, method: "PUT", body });
    cameraEdit = (scope, id, body) => this.http.request(`cameras/${objectId(id)}/`, { scope, method: "PATCH", body });
    cameraActive = (scope, id, active) => this.http.request(`cameras/${objectId(id)}/${active ? "activate" : "deactivate"}/`, { scope, method: "POST" });
    counts = (scope, kind, query, signal) => this.http.request(`${kind}-counts/`, { scope, query, signal });
    countSummary = (scope, kind, query, signal) => this.http.request(`${kind}-counts/summary/`, { scope, query, signal });
    adjustCount = (scope, body, key) => this.http.request("count-adjustments/", { scope, method: "POST", body, replay: Boolean(key), idempotencyKey: key && objectId(key) });
    employees = (scope, query, signal) => this.http.request("memberships/", { scope, query, signal });
    employee = (scope, id, signal) => this.http.request(`memberships/${objectId(id)}/`, { scope, signal });
    grant = (scope, id, signal) => this.http.request(`memberships/${objectId(id)}/schools/`, { scope, signal });
    saveGrant = (scope, id, body) => this.http.request(`memberships/${objectId(id)}/schools/`, { scope, method: "PUT", body });
    employeeRole = (scope, id, role) => this.http.request(`memberships/${objectId(id)}/`, { scope, method: "PATCH", body: { role } });
    employeeActive = (scope, id, active) => this.http.request(`memberships/${objectId(id)}/${active ? "reactivate" : "deactivate"}/`, { scope, method: "POST" });
    invites = (scope, signal) => this.http.request("invitations/", { scope, signal });
    invite = (scope, body) => this.http.request("invitations/", { scope, method: "POST", body });
    inviteAction = (scope, id, action) => this.http.request(`invitations/${objectId(id)}/${action}/`, { scope, method: "POST" });
    conversations = (scope, signal, page = 1) => this.http.request("ai/conversations/", { scope, signal, query: { page } });
    conversation = (scope, id, signal) => this.http.request(`ai/conversations/${objectId(id)}/`, { scope, signal });
    createConversation = (scope, school_id, title) => this.http.request("ai/conversations/", { scope, method: "POST", body: { school_id, title } });
    conversationStatus = (scope, id, status) => this.http.request(`ai/conversations/${objectId(id)}/`, { scope, method: "PATCH", body: { status } });
    deleteConversation = (scope, id) => this.http.request(`ai/conversations/${objectId(id)}/`, { scope, method: "DELETE" });
    messages = (scope, id, signal, page = 1) => this.http.request(`ai/conversations/${objectId(id)}/messages/`, { scope, signal, query: { page } });
    chat = (scope, body) => this.http.request("ai/chat/", { scope, method: "POST", body, replay: true, timeout: 100000 });
    next = (scope, url, signal) => this.http.request(this.http.next(url), { scope, signal });
}
exports.RealiApi = RealiApi;
