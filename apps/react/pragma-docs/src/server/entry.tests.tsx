// @vitest-environment node

/**
 * The cold-store guard on the server entry's Relay environment.
 *
 * A server render that reaches the network is always a bug: the prepare
 * step has already run, so a miss means the store and the render disagree
 * about the operation or its variables.
 *
 * THE MECHANISM CHANGED AT PRD-3, the assertions did not. Before AV-350
 * the endpoint was the same-origin `/graphql`, which the default HTTP path
 * could not resolve server-side: it threw ERR_INVALID_URL from inside a
 * promise React never awaits — an UNHANDLED REJECTION, which takes the
 * whole server PROCESS down. The endpoint is an absolute URL now, so
 * without the guard the same cold render would instead make a REAL fetch
 * to the graph server and reject only if that fetch fails (which, under
 * this suite, it does — nothing is listening on the default port). Either
 * way the rejection is unowned, and either way these tests catch it; the
 * difference is that the modern failure is slower and quieter, which is a
 * reason to keep the guard rather than to relax it.
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

import { readFileSync } from "node:fs";
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
  // No `relay.records`: what any brick hands the renderer when the prepare
  // step produced nothing — an unmapped route, or an unreachable graph.
  const html = renderToString(<EntryServer initialData={{ url }} />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return html;
};

describe("EntryServer against a cold store", () => {
  it("renders the lobby's frame and prose with NO unhandled rejection", async () => {
    const html = await renderColdAndSettle("/");

    // THE assertion: the guard owns the miss, so nothing escapes to the
    // process. Without it, relay-runtime's HTTP path fetches the graph
    // endpoint, the fetch fails (nothing listens), and this array is
    // non-empty — that rejection is what kills the server process.
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

/** The markup between `<head>` and `</head>`, which is what a crawler reads. */
const headOf = (html: string): string =>
  html.match(/<head>(?<head>[\s\S]*?)<\/head>/)?.groups?.head ?? "";

/**
 * The document title, in the head the server actually emits.
 *
 * `@canonical/react-head`'s `<Head>` renders the title as an element and lets
 * React hoist it. Rendered cold, which is the honest case: the prepare step
 * has produced nothing, so this is what a reader gets when the graph server is
 * unreachable.
 *
 * This pins the page's half — one title per route, in `<head>` rather than
 * streamed in after it. The shell's half is pinned separately below, because
 * this render passes no `otherHeadElements` and so never sees `index.html`.
 */
describe("EntryServer emits the page's title", () => {
  it.each([
    ["/", "Home — Pragma docs"],
    ["/components", "Components — Pragma docs"],
    ["/standards", "Standards — Pragma docs"],
    ["/definitions", "Definitions — Pragma docs"],
    ["/definitions/graph", "graph — Definitions — Pragma docs"],
    ["/journeys", "Journeys — Pragma docs"],
    ["/journeys/adopt", "adopt — Journeys — Pragma docs"],
    ["/guides", "Guides — Pragma docs"],
    ["/login", "Login — Pragma docs"],
    ["/playground", "Playground — Pragma docs"],
    ["/guides/routing", "routing — Guides — Pragma docs"],
    ["/no-such-page", "Page not found — Pragma docs"],
  ])("serves %s with exactly one title in <head>", async (url, expected) => {
    const head = headOf(await renderColdAndSettle(url));

    expect(head.match(/<title>/g)?.length ?? 0, url).toBe(1);
    expect(head, url).toContain(`<title>${expected}</title>`);
  });
});

/**
 * The shell's half of the same rule, which the table above cannot reach.
 *
 * The renderer re-emits `index.html`'s head tags AHEAD of the hoisted ones and
 * HTML takes the first `<title>` in tree order, so a `<title>` in the shell
 * would beat every page's. Two assertions, because each catches a different
 * way of losing it: the file itself must carry none, and the ordering that
 * makes that necessary must still be what React does.
 */
describe("the HTML shell yields the title to the page", () => {
  it("carries no <title> of its own", () => {
    const shell = readFileSync(
      new URL("../../index.html", import.meta.url),
      "utf8",
    ).replace(/<!--[\s\S]*?-->/g, "");

    expect(shell).not.toContain("<title>");
  });

  it("would beat the page's title if it carried one", async () => {
    const html = renderToString(
      <EntryServer
        initialData={{ url: "/" }}
        otherHeadElements={[<title key="shell">pragma-docs</title>]}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Both present, shell first — which is exactly why it must carry none.
    expect(headOf(html).match(/<title>[^<]*<\/title>/g)).toEqual([
      "<title>pragma-docs</title>",
      "<title>Home — Pragma docs</title>",
    ]);
  });
});

/**
 * A gap this migration does not close, recorded rather than hidden.
 *
 * The two entity routes read their title off the graph, so their `<Head>` sits
 * inside a component that suspends. Warm — the prepare step has seeded the
 * store — it never suspends and the title reaches the head like every other
 * route's. Cold, the component suspends before `<Head>` renders, React emits
 * the Suspense fallback instead, and the page's title is never produced at
 * all. With the shell's own `<title>` removed, those two routes then serve NO
 * title, where before this change the shell's `pragma-docs` covered them.
 *
 * Closing it properly means resolving the title in the prepare step and
 * handing it down through `initialData`, above the boundary — a larger change
 * than this migration, and the owner's call (see the pull request). Rendering
 * a placeholder `<Head>` in the Suspense fallback was tried and rejected: a
 * local probe emitted no title at all that way, and even where it does, a
 * fallback has no data, so the title would be a guess — and on the streaming
 * bricks a boundary that resolves would leave the guess in `<head>` with the
 * real title stranded in `<body>`.
 *
 * When it is closed, the pin belongs in `src/testing/regression/` as a
 * numbered file rather than as an edit to this describe.
 */
describe("KNOWN GAP: an entity route cold serves no title", () => {
  it.each([
    [
      "a component entity",
      "/components/https%3A%2F%2Fexample.com%2FButton",
      "component-entity",
      "Loading the component…",
    ],
    [
      "a standard",
      "/standards/https%3A%2F%2Fexample.com%2Fcs",
      "standard-reading",
      "Loading the standard…",
    ],
  ])("%s", async (_name, url, view, fallback) => {
    const html = await renderColdAndSettle(url);

    // The route rendered and its interior suspended — which is the cause. A
    // `<Head>` deleted outright would break the warm path and still leave a
    // title-count assertion green, so the cause is pinned, not just the
    // symptom.
    expect(html, url).toContain(`data-view="${view}"`);
    expect(html, url).toContain(fallback);
    // And no title was produced anywhere — not merely hoisted out of <head>.
    expect(html.match(/<title>/g)?.length ?? 0, url).toBe(0);
  });
});
