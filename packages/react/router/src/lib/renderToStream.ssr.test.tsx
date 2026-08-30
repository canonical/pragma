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
    const prefetchSpy = vi.fn(async () => {});
    const router = createRouter({
      home: route({
        url: "/",
        prefetch: prefetchSpy,
        content: () => <main>home-content</main>,
      }),
    });

    const result = await renderToStream(router, "/", {
      fallback: <span>loading</span>,
    });
    const html = await readStream(result.stream);

    expect(result.bootstrapScriptContent).toContain("window.__INITIAL_DATA__");
    expect(result.initialData).toEqual(router.dehydrate());
    expect(html).toContain("home-content");
  });

  it("escapes script-breaking characters in the bootstrap payload", async () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });
    const originalDehydrate = router.dehydrate.bind(router);

    router.dehydrate = () =>
      ({
        marker: "</script><b>\u2028\u2029",
      }) as unknown as ReturnType<typeof originalDehydrate>;

    const result = await renderToStream(router, "/");
    const html = await readStream(result.stream);

    expect(result.bootstrapScriptContent).toContain("\\u003c");
    expect(result.bootstrapScriptContent).toContain("\\u003e");
    expect(result.bootstrapScriptContent).toContain("\\u2028");
    expect(result.bootstrapScriptContent).toContain("\\u2029");
    expect(result.bootstrapScriptContent).not.toContain("</script>");
    expect(html).toContain("home");

    router.dehydrate = originalDehydrate;
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
