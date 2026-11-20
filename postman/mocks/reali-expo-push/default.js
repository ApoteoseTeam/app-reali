const http = require("http");

function reply(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

const server = http.createServer((request, response) => {
  let content = "";
  request.on("data", chunk => { content += chunk; });
  request.on("end", () => {
    if (request.method !== "POST") return reply(response, 501, {});
    let body;
    try { body = JSON.parse(content); }
    catch { return reply(response, 400, {}); }
    if (request.url === "/--/api/v2/push/send") {
      if (!body.to?.startsWith("ExpoPushToken[") || body.title !== "Reali" ||
          Object.keys(body.data ?? {}).join() !== "notification_id" || body.channelId !== "reali") {
        return reply(response, 400, {});
      }
      if (body.to.includes("unavailable")) return reply(response, 503, {});
      return reply(response, 200, { data: { status: "ok", id: "reali-fixture-ticket" } });
    }
    if (request.url === "/--/api/v2/push/getReceipts" && body.ids?.[0] === "reali-fixture-ticket") {
      return reply(response, 200, { data: { "reali-fixture-ticket": { status: "ok" } } });
    }
    return reply(response, 501, {});
  });
});

server.listen(process.env.PORT || 4510);
