const http = require("http");

function reply(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
    return reply(res, 501, { error: { message: "Fixture route unavailable" } });
  }
  let raw = "";
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", () => {
    let request;
    try {
      request = JSON.parse(raw);
      if (!Array.isArray(request.messages) || !Array.isArray(request.tools) ||
          request.store !== false || !Number.isInteger(request.max_completion_tokens)) {
        return reply(res, 400, { error: { message: "Fixture received an invalid request" } });
      }
    } catch {
      return reply(res, 400, { error: { message: "Fixture received invalid JSON" } });
    }
    if (request.model === "fixture-unavailable") {
      return reply(res, 503, { error: { message: "Synthetic upstream outage" } });
    }
    const hasToolResult = request.messages.some((message) => message.role === "tool");
    const message = { role: "assistant", content: JSON.stringify({ mode: "report", refs: [1] }) };
    if (!hasToolResult) {
      const user = request.messages.find((item) => item.role === "user");
      const date = JSON.parse(user.content).as_of;
      message.content = null;
      message.tool_calls = [{
        id: "call_fixture",
        type: "function",
        function: { name: "get_plate_counts", arguments: JSON.stringify({ start_date: date }) },
      }];
    }
    return reply(res, 200, {
      id: "chatcmpl_fixture",
      object: "chat.completion",
      created: 1700000000,
      model: request.model,
      choices: [{ index: 0, message, finish_reason: hasToolResult ? "stop" : "tool_calls" }],
      usage: { prompt_tokens: 30, completion_tokens: 9, total_tokens: 39 },
    });
  });
});

server.listen(process.env.PORT || 4500);
