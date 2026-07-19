// @vitest-environment node

/**
 * The P-4.1 certification: switching lenses moves ONLY the canvas plate —
 * proven by measurement, not eyeballing.
 *
 * Method. Render `EntryServer`'s tree (static router, Relay environment,
 * the `<html>` document) to a string per lens URL — node environment, so
 * `renderToString` walks the exact SSR branch production walks. Called
 * directly, WITHOUT the `JSXRenderer` wrapper production puts around it:
 * the head/script wrapping `JSXRenderer` adds (`otherHeadElements`,
 * `scriptElements`, `linkElements`, the `__INITIAL_DATA__` injection) is out
 * of frame by construction — all of it lands in `<head>` or as scripts,
 * never inside `<body>`, which is exactly why the body-frame measurement
 * below stays valid without it. Split each page's `<body>` at the canvas
 * plate's stable structural identity (the single `<main
 * data-region="canvas">` element):
 * FRAME = body with the canvas's children cut out (the canvas open tag
 * itself is frame — its attributes are chrome). Then:
 *
 *   1. every canvas is pairwise distinct (the comparison is not vacuous);
 *   2. raw frames pairwise DIFFER — the one accounted-for delta, the
 *      router's `aria-current="page"`, is really present and visible to
 *      this measurement (the extraction has eyes on the rail);
 *   3. the aria-current placements are exactly the modelled expectation
 *      per URL (Home carries two: brand + Home lens, both `href="/"`);
 *   4. after normalising ONLY that attribute, all frames are
 *      byte-identical (`toBe` on the strings);
 *   5. the normaliser forgives nothing else — a synthetic one-byte frame
 *      perturbation survives normalisation and fails the comparison.
 *
 * Alongside the markup claim, the stylesheet claims: the four layout
 * tokens and the four z-axis tokens are each DEFINED exactly once across
 * the app's stylesheets (regions consume, never re-define), and exactly
 * one LAYOUT-CAPABLE conditional at-rule — `@media` with any real
 * condition, every `@container`, every `@supports` — exists in the app:
 * the sanctioned AX.1 collapse in Rail/styles.css. Feature queries that
 * cannot reflow layout by design (`prefers-color-scheme`, `forced-colors`,
 * `prefers-reduced-motion`) are exempt, matched by query TEXT, never by
 * file — and only while no other condition rides along in the prelude.
 *
 * Head elements are outside the measurement on purpose: titles are
 * route-owned document state (a11y requires them to change), not chrome.
 * `frame stability` scopes to `<body>`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EntryServer from "../../server/entry.js";

/** The v1 lens URLs, owner-ruled order. */
const LENS_URLS = [
  "/",
  "/components",
  "/definitions",
  "/standards",
  "/guides",
] as const;

/** Per-URL expectation for the accounted-for delta: the hrefs carrying
 * `aria-current="page"`. Home has two — the brand link and the Home lens
 * entry both point at "/". */
const EXPECTED_ARIA_CURRENT: Readonly<Record<string, readonly string[]>> = {
  // Two carriers, deliberately: the router marks BOTH same-destination links
  // exact-match on "/", so screen readers announce current-page twice on
  // Home. Assessed LOW-2 in the P-4.1 review and kept as-modelled; the fix,
  // if it ever bothers, is suppressing aria-current on the brand link.
  "/": ["/", "/"],
  "/components": ["/components"],
  "/definitions": ["/definitions"],
  "/standards": ["/standards"],
  "/guides": ["/guides"],
};

const renderPage = (url: string): string =>
  renderToString(<EntryServer initialData={{ url }} />);

/** Body-scoped page markup (chrome + canvas; head excluded by design). */
const extractBody = (html: string): string => {
  const start = html.indexOf("<body");
  const end = html.lastIndexOf("</body>");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
};

/** Split a body into { frame, canvas }: canvas = the children of the single
 * `<main>` plate; frame = everything else, including the plate's open tag. */
const splitAtCanvas = (body: string): { frame: string; canvas: string } => {
  // The canvas's structural identity must be unique for the cut to be exact.
  expect(body.split("<main").length - 1).toBe(1);
  expect(body.split("</main>").length - 1).toBe(1);
  const open = body.indexOf("<main");
  expect(body.slice(open, body.indexOf(">", open))).toContain(
    'data-region="canvas"',
  );
  const openEnd = body.indexOf(">", open);
  const close = body.lastIndexOf("</main>");
  return {
    frame: body.slice(0, openEnd + 1) + body.slice(close),
    canvas: body.slice(openEnd + 1, close),
  };
};

/** Forgive exactly the accounted-for delta, nothing else. */
const normalizeFrame = (frame: string): string =>
  frame.replaceAll(' aria-current="page"', "");

/** The hrefs of anchors carrying aria-current, in document order. */
const ariaCurrentHrefs = (frame: string): string[] =>
  [...frame.matchAll(/<a\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((anchor) => anchor.includes('aria-current="page"'))
    .map((anchor) => /href="([^"]*)"/.exec(anchor)?.[1] ?? "(no href)");

interface LensPage {
  readonly frame: string;
  readonly canvas: string;
}

/** Rendered lazily inside test context so `splitAtCanvas`'s structural
 * assertions report as test failures, not collection errors. */
let pagesCache: Map<string, LensPage> | undefined;
const getPages = (): Map<string, LensPage> => {
  pagesCache ??= new Map(
    LENS_URLS.map((url) => [url, splitAtCanvas(extractBody(renderPage(url)))]),
  );
  return pagesCache;
};

const mustGet = (url: string): LensPage => {
  const page = getPages().get(url);
  if (page === undefined) throw new Error(`no rendered page for ${url}`);
  return page;
};

describe("frame stability across lens switches (the P-4.1 certification)", () => {
  it("renders every lens's canvas distinctly (the comparison has content)", () => {
    const canvases = [...getPages().values()].map(({ canvas }) => canvas);
    expect(new Set(canvases).size).toBe(LENS_URLS.length);
    // And each canvas holds ITS lens, not a fallback:
    expect(mustGet("/").canvas).toContain('id="home-title"');
    expect(mustGet("/components").canvas).toContain(
      'id="lens-components-title"',
    );
    expect(mustGet("/definitions").canvas).toContain(
      'id="lens-definitions-title"',
    );
    expect(mustGet("/standards").canvas).toContain('id="lens-standards-title"');
    expect(mustGet("/guides").canvas).toContain('id="lens-guides-title"');
  });

  it("carries the full frame on every lens", () => {
    for (const [url, { frame }] of getPages()) {
      for (const marker of [
        'data-region="primary-nav"',
        'data-region="mode-strip"',
        'data-region="canvas"',
        'data-region="footer"',
        'data-slot="controls"',
        'data-slot="status"',
        "Skip to content",
      ]) {
        expect(frame, `${url} frame carries ${marker}`).toContain(marker);
      }
    }
  });

  it("frames differ raw — the accounted-for delta is visible to this measurement", () => {
    const urls = [...getPages().keys()];
    for (const [i, a] of urls.entries()) {
      for (const b of urls.slice(i + 1)) {
        expect(
          mustGet(a).frame === mustGet(b).frame,
          `${a} vs ${b} raw frames must differ (aria-current moved)`,
        ).toBe(false);
      }
    }
  });

  it("places aria-current exactly as modelled, per lens", () => {
    for (const [url, { frame }] of getPages()) {
      expect(ariaCurrentHrefs(frame), `aria-current on ${url}`).toEqual(
        EXPECTED_ARIA_CURRENT[url],
      );
    }
  });

  it("counts every raw aria-current occurrence against the model — anchors or not", () => {
    // BEFORE normalisation, and blind to the carrying element: the
    // anchor-scoped href check above cannot see a stray `aria-current` on a
    // non-anchor, but the normaliser would still forgive it. This count
    // closes that gap — any extra carrier on any element breaks it.
    for (const [url, { frame }] of getPages()) {
      expect(
        (frame.match(/aria-current="page"/g) ?? []).length,
        `raw aria-current count on ${url}`,
      ).toBe(EXPECTED_ARIA_CURRENT[url].length);
    }
  });

  it("frames are byte-identical once the accounted-for delta is normalised", () => {
    const base = normalizeFrame(mustGet("/").frame);
    for (const url of LENS_URLS.slice(1)) {
      expect(normalizeFrame(mustGet(url).frame), `frame of ${url}`).toBe(base);
    }
  });

  it("the normaliser forgives nothing but aria-current (its own teeth)", () => {
    const frame = mustGet("/components").frame;
    const perturbed = frame.replace(
      'data-region="primary-nav"',
      'data-region="primary-nav-tampered"',
    );
    expect(perturbed).not.toBe(frame);
    expect(normalizeFrame(perturbed)).not.toBe(normalizeFrame(frame));
  });
});

/** Recursively collect the app's own stylesheets. */
const collectCss = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return collectCss(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

describe("the shared tokens are defined once (the stylesheet half)", () => {
  const srcDir = fileURLToPath(new URL("../..", import.meta.url));
  const cssFiles = collectCss(srcDir);
  const allCss = cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  it("finds the app stylesheets", () => {
    expect(cssFiles.length).toBeGreaterThanOrEqual(4);
  });

  it.each([
    "--rail-w",
    "--strip-h",
    "--subnav-w",
    "--aside-w",
    "--z-underground",
    "--z-plate",
    "--z-chrome",
    "--z-overlay",
  ])("defines %s exactly once across src/**/*.css", (token) => {
    const definitions = allCss.match(new RegExp(`${token}\\s*:`, "g")) ?? [];
    expect(definitions).toHaveLength(1);
  });

  /**
   * The layout-capable census. Every conditional at-rule prelude
   * (`@media` / `@container` / `@supports`) counts unless it is a media
   * query built ONLY of feature queries that cannot reflow layout by
   * design: `prefers-color-scheme`, `forced-colors`,
   * `prefers-reduced-motion`. The exemption matches query TEXT, never
   * files: stripping the exempt features from the prelude must leave no
   * condition behind, so an exempt feature riding with a width term is
   * still caught. `@container` and `@supports` always count — both can
   * gate layout.
   */
  const layoutCapableConditionals = (): string[] =>
    (allCss.match(/@(?:media|container|supports)[^{]*/g) ?? []).filter(
      (prelude) => {
        if (!prelude.startsWith("@media")) return true;
        const residue = prelude.replaceAll(
          /\((?:prefers-color-scheme|forced-colors|prefers-reduced-motion)[^)]*\)/g,
          "",
        );
        return residue.includes("(");
      },
    );

  it("allows exactly one layout-capable conditional at-rule — the sanctioned AX.1 collapse", () => {
    const conditionals = layoutCapableConditionals();
    expect(conditionals).toHaveLength(1);
    expect(conditionals[0]).toMatch(/^@media[^{]*max-width/);
  });
});
