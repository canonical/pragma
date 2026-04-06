import {
  createRouter,
  createServerAdapter,
  route,
} from "@canonical/router-core";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ServerRouter from "./ServerRouter.js";

const routes = {
  home: route({ url: "/", content: () => <span>home</span> }),
};

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let result = "";
  let done = false;

  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;

    if (chunk.value) {
      result += decoder.decode(chunk.value, { stream: !done });
    }
  }

  return result;
}

describe("ServerRouter", () => {
  it("renders the matched route on the server", async () => {
    const adapter = createServerAdapter("/");
    const router = createRouter(routes, { adapter });

    await router.load("/");

    const stream = (await renderToReadableStream(
      <ServerRouter router={router} />,
    )) as unknown as ReadableStream;
    const html = await streamToString(stream);

    expect(html).toContain("home");
  });
});
