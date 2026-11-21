"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noticeId = noticeId;
exports.pushNoticeId = pushNoticeId;
exports.noticeDestination = noticeDestination;
exports.enrollPush = enrollPush;
const reali_1 = require("./reali");
function noticeId(value) {
    if (typeof value !== "string")
        return null;
    try {
        return (0, reali_1.objectId)(value);
    }
    catch {
        return null;
    }
}
function pushNoticeId(data) {
    return data && typeof data === "object" && "notification_id" in data
        ? noticeId(data.notification_id) : null;
}
function noticeDestination(notice, organization, school, can) {
    if (notice.organization !== organization || notice.school !== school)
        return null;
    const id = noticeId(notice.data.resource_id);
    if (notice.data.resource === "camera" && id && can("camera_status"))
        return { pathname: "/camera", params: { id } };
    if (notice.data.resource === "meal" && id && can("meal_history"))
        return { pathname: "/servico", params: { id } };
    if (notice.data.resource === "reports" && can("analytics_reports"))
        return { pathname: "/relatorio" };
    return null;
}
async function enrollPush(options) {
    if (options.signal?.aborted)
        return "cancelled";
    const allowed = await options.permission();
    if (options.signal?.aborted)
        return "cancelled";
    if (!allowed)
        return "denied";
    const token = await options.token();
    if (options.signal?.aborted)
        return "cancelled";
    if (!/^(?:ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{8,200}\]$/.test(token))
        return "invalid";
    await options.register(token);
    return options.signal?.aborted ? "cancelled" : "active";
}
