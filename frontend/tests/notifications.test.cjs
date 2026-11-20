const test = require("node:test");
const assert = require("node:assert/strict");
const { HttpClient } = require("../.test-build/api/client.js");
const { RealiApi } = require("../.test-build/api/reali.js");
const { enrollPush, noticeDestination, pushNoticeId } = require("../.test-build/api/notificationActions.js");
const { SessionTokens } = require("../.test-build/session/tokens.js");

const organization = "d979db08-0599-40bb-a1ed-a0c585990905";
const school = "47364029-4dc3-483d-a1fa-d9fec6e67747";
const id = "44b84ee1-f40f-4f85-9bdd-ee6000d7a7af";
const resource = "378c5691-c9d6-47c6-be2b-c120b70c8dc4";
const expoToken = "ExpoPushToken[device-fixture]";
const base = () => "https://reali.test/api/v1";
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("lists notifications, reads unread count and marks a notification as read in the active school", async () => {
  const requests = [];
  const api = new RealiApi(new HttpClient(base, {
    credentials: () => ({ access: "session", generation: 0 }),
    refresh: async () => assert.fail("unexpected refresh"),
  }, async (url, options) => {
    const path = new URL(url);
    requests.push(options.method);
    assert.equal(path.searchParams.get("school_id"), school);
    assert.equal(options.headers["X-Organization-ID"], organization);
    assert.equal(options.headers.Authorization, "Bearer session");
    if (path.pathname.endsWith("unread-count/")) return json({ unread_count: 2 });
    if (path.pathname.endsWith("read/")) return json({ id, read_at: "2026-11-20T11:12:00-03:00" });
    assert.equal(path.searchParams.get("unread"), "true");
    return json({ count: 1, next: null, previous: null, results: [{ id }] });
  }));
  const scope = { organization };
  assert.equal((await api.notices(scope, { school_id: school, unread: true })).results[0].id, id);
  assert.equal((await api.unreadNotices(scope, school)).unread_count, 2);
  assert.ok((await api.updateNotice(scope, school, id, "read")).read_at);
  assert.deepEqual(requests, ["GET", "GET", "POST"]);
});

test("uses only a notification ID from a push and rejects destinations outside the selected context", () => {
  assert.equal(pushNoticeId({ notification_id: id, href: "https://untrusted.test" }), id);
  assert.equal(pushNoticeId({ notification_id: "../admin", href: "/camera" }), null);
  const notice = { id, organization, school, data: { resource: "camera", resource_id: resource } };
  assert.deepEqual(noticeDestination(notice, organization, school, action => action === "camera_status"),
    { pathname: "/camera", params: { id: resource } });
  assert.equal(noticeDestination(notice, organization, school, () => false), null);
  assert.equal(noticeDestination(notice, organization, id, () => true), null);
  assert.equal(noticeDestination(notice, id, school, () => true), null);
  assert.equal(noticeDestination({ ...notice, data: { resource: "camera", resource_id: "https://untrusted.test" } },
    organization, school, () => true), null);
});

test("keeps push optional and registers only a current, valid token", async () => {
  const calls = [];
  const register = async token => { calls.push(token); };
  const token = async () => expoToken;
  assert.equal(await enrollPush({ permission: async () => false, token: async () => assert.fail(), register }), "denied");
  assert.equal(await enrollPush({ permission: async () => true, token: async () => "invalid", register }), "invalid");
  const controller = new AbortController();
  assert.equal(await enrollPush({
    signal: controller.signal, permission: async () => true, token: async () => { controller.abort(); return expoToken; }, register,
  }), "cancelled");
  assert.equal(await enrollPush({ permission: async () => true, token, register }), "active");
  assert.deepEqual(calls, [expoToken]);
});

test("registers the installation with JWT and logs out using the associated refresh session", async () => {
  let remembered;
  const tokens = new SessionTokens({ read: async () => remembered, write: async value => { remembered = value; } });
  const requests = [];
  const http = new HttpClient(base, tokens, async (url, options) => {
    requests.push(new URL(url).pathname);
    const body = JSON.parse(options.body);
    if (url.includes("push-devices")) {
      assert.equal(options.headers.Authorization, "Bearer access");
      assert.equal(body.installation, id);
      assert.equal(body.push_token, expoToken);
      return json({ id: resource }, 201);
    }
    assert.deepEqual(body, { refresh: "refresh" });
    return json({});
  });
  tokens.attach(http);
  await tokens.accept({ access: "access", refresh: "refresh" }, 0);
  const api = new RealiApi(http);
  const registration = await api.registerPush({ installation: id, installation_secret: "a".repeat(64), push_token: expoToken, platform: "IOS" });
  assert.equal(registration.id, resource);
  await tokens.logout();
  assert.equal(tokens.credentials().access, null);
  assert.equal(remembered, null);
  assert.deepEqual(requests, ["/api/v1/notifications/push-devices/", "/api/v1/auth/logout/"]);
});
