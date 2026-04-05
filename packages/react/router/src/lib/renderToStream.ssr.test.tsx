import type { ReadableStream } from "node:stream/web";
import { createRouter, route } from "@canonical/router-core";
import { describe, expect, it, vi } from "vitest";
import renderToStream from "./renderToStream.js";

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

describe("renderToStream", () => {
  it("loads the route, renders the server router, and returns bootstrap data", async () => {
    const fetchSpy = vi.fn(async () => "home-data");
    const router = createRouter({
      home: route({
        url: "/",
        fetch: fetchSpy,
        content: ({ data }) => <main>{String(data)}</main>,
      }),
    });

    const result = await renderToStream(router, "/", {
      fallback: <span>loading</span>,
    });
    const html = await readStream(result.stream);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.loadResult.routeData).toBe("home-data");
    expect(result.bootstrapScriptContent).toContain("window.__INITIAL_DATA__");
    expect(result.initialData).toEqual(router.dehydrate());
    expect(html).toContain("home-data");
  });

  it("returns a null bootstrap script when dehydration is unavailable", async () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });
    const originalDehydrate = router.dehydrate.bind(router);

    router.dehydrate = () => null;

    const result = await renderToStream(router, "/");
    const html = await readStream(result.stream);

    expect(result.bootstrapScriptContent).toBeNull();
    expect(result.initialData).toBeNull();
    expect(result.loadResult.match).not.toBeNull();
    expect(html).toContain("home");

    router.dehydrate = originalDehydrate;
  });
});
