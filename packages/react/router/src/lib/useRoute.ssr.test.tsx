import type { ReadableStream } from "node:stream/web";
import { createRouter, route } from "@canonical/router-core";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RouterProvider from "./RouterProvider.js";
import useRoute from "./useRoute.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
};

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = "";

  while (true) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    html += decoder.decode(result.value, { stream: true });
  }

  html += decoder.decode();

  return html;
}

function Probe() {
  const location = useRoute<typeof routes>();

  Reflect.get(location as object, Symbol.toStringTag);

  return <span>{location.pathname}</span>;
}

describe("useRoute SSR", () => {
  it("uses the server snapshot during server rendering", async () => {
    const router = createRouter(routes);

    await router.load("/");

    const stream = await renderToReadableStream(
      <RouterProvider router={router}>
        <Probe />
      </RouterProvider>,
    );
    const html = await readStream(stream as unknown as ReadableStream);

    expect(html).toContain("/");
  });
});
