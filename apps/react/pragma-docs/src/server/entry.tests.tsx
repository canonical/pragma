// @vitest-environment node

/**
 * The cold-store guard on the server entry's Relay environment.
 *
 * A server render that reaches the network is always a bug: there is no
 * origin to resolve the same-origin `/graphql` against. Before AV-350 the
 * default HTTP path threw ERR_INVALID_URL from inside a promise React
 * never awaits — an UNHANDLED REJECTION, which takes the whole server
 * PROCESS down. Observed on both backend-less preview bricks
 * (`renderer.tsx` runs no prepare step until the Oxigraph spike closes),
 * on every data-bearing route. The lobby made it reachable at `/`, the
 * one URL the e2e matrix fetches for all six cells.
 *
 * The guard reports the miss as a REJECTED PROMISE that Relay owns
 * (its network contract for a failed operation) rather than a synchronous
 * throw: a throw escapes during the render pass, which the express brick
 * turns into a hard 500 while the bun brick — shell already flushed —
 * degrades instead. The two bricks must not disagree.
 *
 * Teeth. `renderToString` COMPLETING is not the assertion: it completes
 * either way, because the crash is asynchronous. What this pins is that
 * no unhandled rejection escapes to the process — the actual failure
 * mode. Removing the `fetchFn` guard from `entry.tsx` fails the first
 * test here (verified by reverting it).
 */

import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import EntryServer from "./entry.js";

/** Rejections that reached the process during a test. */
let unhandled: unknown[] = [];
const captureUnhandled = (reason: unknown): void => {
  unhandled.push(reason);
};

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", captureUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", captureUnhandled);
});

/**
 * Render `url` cold and let any rejection settle. The macrotask turn is
 * load-bearing: an unhandled rejection is only reported once the
 * microtask queue drains with no handler attached.
 */
const renderColdAndSettle = async (url: string): Promise<string> => {
  // No `relay.records`: exactly what a backend-less preview brick hands
  // the renderer.
  const html = renderToString(<EntryServer initialData={{ url }} />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return html;
};

describe("EntryServer against a cold store", () => {
  it("renders the lobby's frame and prose with NO unhandled rejection", async () => {
    const html = await renderColdAndSettle("/");

    // THE assertion: the guard owns the miss, so nothing escapes to the
    // process. Without it, relay-runtime's HTTP path rejects with
    // ERR_INVALID_URL on `/graphql` and this array is non-empty — that
    // rejection is what kills the preview servers.
    expect(unhandled).toEqual([]);

    // The render completed: the shell the e2e matrix asserts on…
    expect(html).toContain('id="root"');
    // …the frame…
    expect(html).toContain('data-region="canvas"');
    // …and the lobby's authored prose, which sits OUTSIDE the Suspense
    // boundary precisely so it survives a graph miss.
    expect(html).toContain('id="lobby-title"');
    expect(html).toContain('data-slot="hero"');

    // The graph-dependent bands are honestly absent rather than faked.
    expect(html).not.toContain('data-slot="doors"');
    expect(html).not.toContain('data-slot="examples"');
  });

  it("does the same for the other data-bearing lens routes", async () => {
    // The guard is route-agnostic: /components, /standards and
    // /definitions crashed the preview process the same way before it
    // existed.
    for (const url of ["/components", "/standards", "/definitions"]) {
      const html = await renderColdAndSettle(url);
      expect(unhandled, `cold render of ${url}`).toEqual([]);
      expect(html, `cold render of ${url}`).toContain('id="root"');
      expect(html, `cold render of ${url}`).toContain('data-region="canvas"');
    }
  });
});
