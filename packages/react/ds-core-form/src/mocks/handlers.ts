import { http } from "msw";

const handlers = [
  http.get("/api/test", () => {
    return new Response(JSON.stringify({ message: "Hello from MSW!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
  http.get("/api/example", () => {
    return new Response(JSON.stringify({ message: "Hello from MSW!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
];

export default handlers;
