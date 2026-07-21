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
 *   2. raw frames pairwise DIFFER — the accounted-for deltas (the
 *      router's `aria-current="page"`, and since P-5 the mode strip's
 *      claimed context text) are really present and visible to this
 *      measurement (the extraction has eyes on the rail and the strip);
 *   3. the aria-current placements are exactly the modelled expectation
 *      per URL (Home carries two: brand + Home lens, both `href="/"`),
 *      and the strip's three claimable slots — `context`, `controls`,
 *      `status` — match the per-URL model RAW; normalisation can never
 *      hide a wrong claim, because the raw content is asserted first;
 *   4. after normalising ONLY those deltas (strip the attribute, blank
 *      exactly the three claimed slots' contents), all frames are
 *      byte-identical (`toBe` on the strings);
 *   5. the normaliser forgives nothing else — synthetic perturbations to
 *      the strip's own region, to any slot's IDENTITY attributes, and to
 *      the frame at large all survive normalisation and fail the
 *      comparison.
 *
 * THE R5 LOOSENING (owner-approved, recorded here rather than smuggled).
 * Until AV-274 this suite asserted `controls` and `status` were EMPTY on
 * every URL, and its teeth test used planted status text as proof that the
 * normaliser's scope was one slot. The Definitions lens now claims both
 * sockets — a filter toolbar and a status figure — because a strip that is
 * never used is furniture pretending to be an instrument. So the model
 * widened: per-URL claims for all three slots, asserted RAW, with the
 * normaliser blanking exactly those three. The teeth test grew to
 * compensate, and now proves the widened normaliser still catches a
 * renamed socket, a tampered strip region, and frame changes elsewhere —
 * the properties the old status-planting control used to establish.
 *
 * The claims are asserted STRUCTURALLY, not as pinned strings: the status
 * figure carries a live count off the graph, and pinning it would turn
 * every ontology edit into a frame-stability failure — a false alarm about
 * something this suite does not measure.
 *
 * Since P-5 the measured set also carries a non-lens URL — the Button
 * entity page — rendered from its captured fixture records (initialData,
 * exactly what the dev servers embed), so its canvas is real content and
 * nothing in the render path waits on a network that node does not have.
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
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it } from "vitest";
import catalogRecords from "#domains/components/__fixtures__/catalogRecords.js";
import componentEntityRecordsButton from "#domains/components/__fixtures__/componentEntityRecordsButton.js";
import definitionsExplorerRecords from "#domains/lenses/definitions/__fixtures__/definitionsExplorerRecords.js";
import journeysExplorerRecords from "#domains/lenses/journeys/__fixtures__/journeysExplorerRecords.js";
import journeysExplorerRecordsJob from "#domains/lenses/journeys/__fixtures__/journeysExplorerRecordsJob.js";
import standardEntityRecords from "#domains/lenses/standards/__fixtures__/standardEntityRecords.js";
import standardsIndexRecords from "#domains/lenses/standards/__fixtures__/standardsIndexRecords.js";
import lobbyRecords from "#domains/marketing/__fixtures__/lobbyRecords.js";
import EntryServer from "../../server/entry.js";

/** The v1 lens URLs, owner-ruled order. */
const LENS_URLS = [
  "/",
  "/components",
  "/definitions",
  "/standards",
  "/journeys",
  "/guides",
] as const;

/** The P-5 entity exemplar: a non-lens URL whose frame must still be the
 * same instrument body. Exact-match linking means NO rail entry carries
 * `aria-current` here (ruling R3). */
const BUTTON_ENTITY_URL = "/components/ds%3Aglobal.component.button";

/** The P-5 definitions exemplar: the term view — a second non-lens URL,
 * and the one whose canvas carries the React Flow well's server-rendered
 * node DOM. Same R3 posture: no rail entry is exact-current here. */
const DEFINITIONS_TERM_URL = "/definitions/ds%3AUIBlock";

/** The P-5 standards exemplar: the reading page — a third non-lens URL,
 * whose canvas is layout.reading's measured prose column. Same R3
 * posture: no rail entry is exact-current here. */
const STANDARD_READING_URL = "/standards/cs%3Areact.component.link_component";

/** The AV-351 journeys exemplar: the job view — a fourth non-lens URL,
 * and the second whose canvas carries a React Flow well's server-rendered
 * node DOM. Same R3 posture: no rail entry is exact-current here. */
const JOURNEYS_JOB_URL = "/journeys/sem%3A%2F%2Fdesign-system-docs%23job.l3";

/** Every URL the certification measures. */
const MEASURED_URLS = [
  ...LENS_URLS,
  BUTTON_ENTITY_URL,
  DEFINITIONS_TERM_URL,
  STANDARD_READING_URL,
  JOURNEYS_JOB_URL,
] as const;

/** Data-bearing pages render from their captured fixture records — the
 * `initialData` a dev server would embed — so canvases are real content. */
const PAGE_RECORDS: Readonly<Record<string, RecordMap>> = {
  // The Home lobby (AV-350): the front door now reads the graph too, so
  // its canvas renders from a captured fixture like every other
  // data-bearing page.
  "/": lobbyRecords,
  "/components": catalogRecords,
  [BUTTON_ENTITY_URL]: componentEntityRecordsButton,
  // Definitions rows: the explorer (no term) reads only `ontologies`,
  // which the captured term fixture carries — one fixture, both
  // definitions addresses.
  "/definitions": definitionsExplorerRecords,
  [DEFINITIONS_TERM_URL]: definitionsExplorerRecords,
  // Standards rows (P-5): the grouped index from its trimmed capture,
  // the reading page from its verbatim capture.
  "/standards": standardsIndexRecords,
  [STANDARD_READING_URL]: standardEntityRecords,
  // Journeys rows (AV-351): the same operation at both addresses, but
  // the selected address's store carries one extra root field
  // (`job(uri: …)`) that the @include(if: $hasJob) arm adds — so each
  // address replays its OWN verbatim capture.
  "/journeys": journeysExplorerRecords,
  [JOURNEYS_JOB_URL]: journeysExplorerRecordsJob,
};

/** Per-URL expectation for the first accounted-for delta: the hrefs
 * carrying `aria-current="page"`. Home has two — the brand link and the
 * Home lens entry both point at "/". The entity URL has NONE: the rail's
 * Components entry is an exact-match link (R3). */
const EXPECTED_ARIA_CURRENT: Readonly<Record<string, readonly string[]>> = {
  // Two carriers, deliberately: the router marks BOTH same-destination links
  // exact-match on "/", so screen readers announce current-page twice on
  // Home. Assessed LOW-2 in the P-4.1 review and kept as-modelled; the fix,
  // if it ever bothers, is suppressing aria-current on the brand link.
  "/": ["/", "/"],
  "/components": ["/components"],
  "/definitions": ["/definitions"],
  "/standards": ["/standards"],
  "/journeys": ["/journeys"],
  "/guides": ["/guides"],
  [BUTTON_ENTITY_URL]: [],
  // Exact-match linking (R3): the rail's Definitions entry is NOT current
  // at a term URL. The term links that ARE current live in the canvas
  // (rail item + well node), outside this frame measurement.
  [DEFINITIONS_TERM_URL]: [],
  // Same R3 posture: the rail's Standards entry is NOT current at a
  // reading URL.
  [STANDARD_READING_URL]: [],
  // …and the rail's Journeys entry is NOT current at a job URL.
  [JOURNEYS_JOB_URL]: [],
};

/**
 * Per-URL expectation for the second accounted-for delta: the mode strip's
 * claimed `data-slot="context"` MARKUP (the P-6 handshake). Until P-6 this
 * was a bare lens-name string; the owner ruling moved every page title out
 * of the canvas and INTO the strip as the DS `Breadcrumbs` pattern, so the
 * context socket now holds the trail markup, and the model must assert it
 * HONESTLY — RAW, before the normaliser blanks it.
 *
 * The trail is URL-DERIVED, which is exactly why this can be pinned without
 * pinning a graph count: an INDEX page is one current crumb (the lens name);
 * an ENTITY page is the lens crumb (a router link back to the index) plus
 * the current crumb, whose text is the ROUTE PARAM (a prefixed URI/slug),
 * not a fetched display name — so the assertion stays stable across ontology
 * edits, and a wrong claim (or a stub suddenly claiming one) fails here
 * first. `/guides` still claims nothing, so its context slot is empty.
 */

/** Build the exact breadcrumb markup a `LensBreadcrumbs` renders in the
 * strip. An `entity` present ⇒ the ENTITY shape (linked lens crumb + current
 * terminal crumb); absent ⇒ the INDEX shape (the lens crumb IS current). */
const trail = (
  lensLabel: string,
  entity?: { readonly lensHref: string; readonly current: string },
): string => {
  const nav = (inner: string): string =>
    `<nav class="ds breadcrumbs ds lens-breadcrumbs" aria-label="Breadcrumb"><ol class="list p">${inner}</ol></nav>`;
  const sep = '<span class="separator" aria-hidden="true">/</span>';
  const currentCrumb = (label: string): string =>
    `<li class="ds breadcrumbs-item current">${sep}<span class="link" aria-current="page">${label}</span></li>`;
  if (entity === undefined) return nav(currentCrumb(lensLabel));
  const linkCrumb = `<li class="ds breadcrumbs-item">${sep}<a class="link" href="${entity.lensHref}">${lensLabel}</a></li>`;
  return nav(linkCrumb + currentCrumb(entity.current));
};

const EXPECTED_STRIP_CONTEXT: Readonly<Record<string, string>> = {
  // The lobby claims its lens name too (AV-350) — "Home", exactly as the
  // Rail's LENS_ENTRIES labels it; on its single address it is one current
  // crumb. Only `/guides` (still a stub) claims nothing.
  "/": trail("Home"),
  "/components": trail("Components"),
  "/definitions": trail("Definitions"),
  "/standards": trail("Standards"),
  "/journeys": trail("Journeys"),
  "/guides": "",
  // Entity pages: the lens crumb links back to the index, the terminal
  // crumb is the ROUTE PARAM (percent-decoded), never a live display name.
  [BUTTON_ENTITY_URL]: trail("Components", {
    lensHref: "/components",
    current: "ds:global.component.button",
  }),
  [DEFINITIONS_TERM_URL]: trail("Definitions", {
    lensHref: "/definitions",
    current: "ds:UIBlock",
  }),
  [STANDARD_READING_URL]: trail("Standards", {
    lensHref: "/standards",
    current: "cs:react.component.link_component",
  }),
  [JOURNEYS_JOB_URL]: trail("Journeys", {
    lensHref: "/journeys",
    current: "sem://design-system-docs#job.l3",
  }),
};

/** Per-URL count of `aria-current="page"` carried INSIDE the strip context
 * slot: the breadcrumb trail's terminal (current) crumb carries exactly one,
 * on every URL that claims a Context — i.e. every measured URL but `/guides`
 * (the lone stub with an empty context). The raw aria-current census below
 * adds this to the rail's anchor count, because the current crumb is a
 * `<span>`, invisible to the anchor-scoped href model but real to a total
 * count over the whole frame. */
const STRIP_CONTEXT_ARIA_CURRENT: Readonly<Record<string, number>> = {
  "/": 1,
  "/components": 1,
  "/definitions": 1,
  "/standards": 1,
  "/journeys": 1,
  "/guides": 0,
  [BUTTON_ENTITY_URL]: 1,
  [DEFINITIONS_TERM_URL]: 1,
  [STANDARD_READING_URL]: 1,
  [JOURNEYS_JOB_URL]: 1,
};

/**
 * Per-URL expectation for the third and fourth accounted-for deltas: the
 * strip's `controls` and `status` claims (R5 — "a toolbar and the top bar
 * should be useful"). Only the Definitions views claim them; every other
 * URL must still render both sockets EMPTY, and this model is what says so.
 *
 * The claims are asserted STRUCTURALLY, never as pinned strings. The
 * status figure reports a live count off the graph, so pinning its text
 * would make the frame certification fail whenever the ontology gains a
 * class — a false alarm about frame stability, which is not what this
 * suite measures. Structure ("does this slot carry the toolbar / the
 * figure, or nothing at all?") is the honest claim, and it is the claim
 * whose violation would actually mean the frame moved.
 */
const EXPECTED_STRIP_CLAIMS: Readonly<
  Record<
    string,
    {
      /** The controls slot's expected tenant: which `data-slot` marker its
       * inner markup must carry, or `false` for an empty socket. Different
       * lenses fill it with different toolbars (definitions → chips,
       * journeys → the view switch), so the claim is the marker, not a bare
       * boolean. */
      readonly controls: string | false;
      readonly status: boolean;
    }
  >
> = {
  "/": { controls: false, status: false },
  "/components": { controls: false, status: false },
  "/definitions": { controls: "explorer-controls", status: true },
  "/standards": { controls: false, status: false },
  // Journeys claims CONTEXT and CONTROLS (RULING 1). The `controls` socket
  // holds the Table ⇄ Graph view switch — the one journeys instrument that
  // is genuinely a strip toolbar: it chooses which reading the canvas shows,
  // needs no explanatory caveat, and its labels are data-independent. (The
  // lens's OTHER controls — the coordinate chooser and the persona filter —
  // stay in the rail, each needing its own explanatory text.) The `status`
  // socket stays empty — the lens has no single figure worth a live count.
  "/journeys": { controls: "journeys-view", status: false },
  "/guides": { controls: false, status: false },
  [BUTTON_ENTITY_URL]: { controls: false, status: false },
  [DEFINITIONS_TERM_URL]: { controls: "explorer-controls", status: true },
  [STANDARD_READING_URL]: { controls: false, status: false },
  // The job view claims the switch too — the view is ephemeral, not
  // URL-derived, so both journeys addresses carry the same strip tenant.
  [JOURNEYS_JOB_URL]: { controls: "journeys-view", status: false },
};

const renderPage = (url: string): string =>
  renderToString(
    <EntryServer
      initialData={{
        url,
        ...(PAGE_RECORDS[url]
          ? { relay: { records: PAGE_RECORDS[url] } }
          : undefined),
      }}
    />,
  );

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

/**
 * The strip's context slot, as the ModeStrip renders it. Since P-6 this
 * holds ELEMENTS — the DS `Breadcrumbs` trail — not a bare string, so the
 * content group is non-greedy across markup (like controls/status below),
 * bounded by the next slot's open tag. The pattern still pins the slot's
 * full identity (class + data-slot), so it can never latch onto a sibling.
 */
const STRIP_CONTEXT_PATTERN =
  /(<div class="strip-context" data-slot="context">)([\s\S]*?)(<\/div><div class="strip-controls")/;

/**
 * The controls and status slots. Like `context`, these hold ELEMENTS
 * (a chip toolbar, a status figure), so the content group is non-greedy
 * across markup rather than text-only. Each pattern still pins the slot's
 * full identity, so it can never latch onto a sibling.
 */
const STRIP_CONTROLS_PATTERN =
  /(<div class="strip-controls" data-slot="controls">)([\s\S]*?)(<\/div><div class="strip-status")/;
const STRIP_STATUS_PATTERN =
  /(<div class="strip-status" data-slot="status">)([\s\S]*?)(<\/div><\/header>)/;

/** The context slot's RAW text — asserted against the model BEFORE any
 * normalisation, so blanking below can never hide a wrong claim. */
const extractStripContext = (frame: string): string => {
  const match = STRIP_CONTEXT_PATTERN.exec(frame);
  expect(match, "frame carries exactly one context slot").not.toBeNull();
  return (match as RegExpExecArray)[2];
};

/** The controls/status slots' RAW inner markup, asserted before
 * normalisation for the same reason the context text is. */
const extractStripSlot = (frame: string, pattern: RegExp): string => {
  const match = pattern.exec(frame);
  expect(match, "frame carries exactly one such strip slot").not.toBeNull();
  return (match as RegExpExecArray)[2];
};

/**
 * Forgive exactly the accounted-for deltas, nothing else: strip the
 * router's aria-current attribute, then blank ONLY the three claimed strip
 * slots' contents. Widened for the controls/status claims — an
 * owner-approved loosening, paid for by the RAW per-URL assertions above
 * it and by the teeth test below, which proves the widened normaliser
 * still catches everything outside those three slots.
 */
const normalizeFrame = (frame: string): string =>
  frame
    .replaceAll(' aria-current="page"', "")
    .replace(STRIP_CONTEXT_PATTERN, "$1$3")
    .replace(STRIP_CONTROLS_PATTERN, "$1$3")
    .replace(STRIP_STATUS_PATTERN, "$1$3");

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
    MEASURED_URLS.map((url) => [
      url,
      splitAtCanvas(extractBody(renderPage(url))),
    ]),
  );
  return pagesCache;
};

const mustGet = (url: string): LensPage => {
  const page = getPages().get(url);
  if (page === undefined) throw new Error(`no rendered page for ${url}`);
  return page;
};

describe("frame stability across lens switches (the P-4.1 certification)", () => {
  it("renders every measured canvas distinctly (the comparison has content)", () => {
    const canvases = [...getPages().values()].map(({ canvas }) => canvas);
    expect(new Set(canvases).size).toBe(MEASURED_URLS.length);
    // And each canvas holds ITS page, not a fallback:
    expect(mustGet("/").canvas).toContain('id="lobby-title"');
    // The lobby canvas renders REAL projections from its fixture records:
    // an exemplar link off ds:Component and the doors band.
    expect(mustGet("/").canvas).toContain(
      'href="/components/ds%3Aglobal.component.accordion"',
    );
    expect(mustGet("/").canvas).toContain('data-slot="doors"');
    expect(mustGet("/components").canvas).toContain(
      'id="lens-components-title"',
    );
    // The catalog canvas renders REAL cards from its fixture records.
    expect(mustGet("/components").canvas).toContain("Accordion");
    expect(mustGet("/components").canvas).toContain(
      'data-region="secondary-nav"',
    );
    expect(mustGet("/definitions").canvas).toContain(
      'id="lens-definitions-title"',
    );
    // The definitions canvases render REAL explorer content from the
    // fixture records: the term canvas carries the inspector's class
    // record AND the React Flow well's server-rendered node DOM; the
    // term-less canvas carries the honest empty inspector.
    expect(mustGet("/definitions").canvas).toContain("Select a term");
    expect(mustGet(DEFINITIONS_TERM_URL).canvas).toContain(
      '<h2 id="term-inspector-title">UI Block</h2>',
    );
    expect(mustGet(DEFINITIONS_TERM_URL).canvas).toContain(
      "react-flow__node-term",
    );
    expect(mustGet("/standards").canvas).toContain('id="lens-standards-title"');
    // The standards canvases render REAL content from their fixture
    // records: the index carries a grouped standard link, the reading
    // canvas carries the article's identity h1 (URI-as-title — no live
    // display name) inside layout.reading's prose column.
    expect(mustGet("/standards").canvas).toContain("cs:code.array.safe_access");
    expect(mustGet(STANDARD_READING_URL).canvas).toContain(
      'data-view="standard-reading"',
    );
    expect(mustGet(STANDARD_READING_URL).canvas).toContain(
      '<h1 id="standard-reading-title">cs:react.component.link_component</h1>',
    );
    expect(mustGet(STANDARD_READING_URL).canvas).toContain(
      'data-slot="reading-canvas"',
    );
    // The journeys canvases render REAL content from the fixture records:
    // the index carries the PRIMARY-SURFACE table (AV-351). The table and
    // the graph are ONE reading at a time (RULING 1), with the TABLE as the
    // default — so the default SSR output is the table, and the well's node
    // DOM is a client transition, NOT in the served markup.
    expect(mustGet("/journeys").canvas).toContain('id="lens-journeys-title"');
    // The table is the lens's primary surface and the DEFAULT view, and it
    // SSRs: its slot, its row-header cells and its group-by control are all
    // in the served markup — the sortable data table exists before any
    // client JS.
    expect(mustGet("/journeys").canvas).toContain('data-slot="journeys-table"');
    expect(mustGet("/journeys").canvas).toContain('scope="row"');
    expect(mustGet("/journeys").canvas).toContain("Group by");
    // The view switch is NO LONGER in the canvas (RULING 1): it is the mode
    // strip's `controls` tenant now, so it lands in the FRAME, not here. The
    // strip claim is asserted by EXPECTED_STRIP_CLAIMS below; the canvas must
    // NOT carry the switch.
    expect(mustGet("/journeys").canvas).not.toContain(
      'aria-label="Journey view"',
    );
    // RULING 2: the DEFAULT (table) view drops the inspector column, so the
    // inspector region is absent from the default canvas — no empty column,
    // and no "Select a job" empty-inspector prompt in table mode.
    expect(mustGet("/journeys").canvas).not.toContain(".journey-inspector");
    expect(mustGet("/journeys").canvas).not.toContain(
      'id="journey-inspector-title"',
    );
    // HONEST: the well (react-flow node DOM) is NOT in the default output —
    // the graph is the non-default view, reached by the client switch. This
    // used to assert the node DOM was present because the well SSR'd
    // alongside the table; with one-view-at-a-time and table-default, the
    // default canvas is the table alone.
    expect(mustGet("/journeys").canvas).not.toContain("react-flow__node-hop");
    // The job canvas defaults to the table too (the view is ephemeral, not
    // URL-derived), so it carries the TABLE — not the inspector (dropped in
    // table mode, RULING 2) and not the well's node DOM (the non-default
    // view). The selected job is still in the URL; it only surfaces once the
    // reader flips to the graph.
    expect(mustGet(JOURNEYS_JOB_URL).canvas).toContain(
      'data-slot="journeys-table"',
    );
    expect(mustGet(JOURNEYS_JOB_URL).canvas).not.toContain(
      'id="journey-inspector-title"',
    );
    expect(mustGet(JOURNEYS_JOB_URL).canvas).not.toContain(
      "react-flow__node-hop",
    );
    expect(mustGet("/guides").canvas).toContain('id="lens-guides-title"');
    // The entity page renders its REAL data from the fixture records, not
    // a loading state — the whole view SSRs from a warm store.
    expect(mustGet(BUTTON_ENTITY_URL).canvas).toContain(
      'data-view="component-entity"',
    );
    expect(mustGet(BUTTON_ENTITY_URL).canvas).toContain(
      '<h1 id="component-entity-title">Button</h1>',
    );
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
    //
    // The total is the rail's exact-match anchors PLUS the strip
    // breadcrumb's terminal (current) crumb — a `<span aria-current="page">`
    // the anchor model above cannot see, present on every URL that claims a
    // Context (all but `/guides`). Both carriers are modelled, so an
    // unaccounted-for third would break this.
    for (const [url, { frame }] of getPages()) {
      expect(
        (frame.match(/aria-current="page"/g) ?? []).length,
        `raw aria-current count on ${url}`,
      ).toBe(
        EXPECTED_ARIA_CURRENT[url].length + STRIP_CONTEXT_ARIA_CURRENT[url],
      );
    }
  });

  it("carries the strip context exactly as modelled, per URL — RAW", () => {
    // The raw slot text is the assertion; the normaliser below only blanks
    // what THIS test has already proven correct. A route claiming the
    // wrong context (or a stub suddenly claiming one) fails here first.
    for (const [url, { frame }] of getPages()) {
      expect(extractStripContext(frame), `strip context on ${url}`).toBe(
        EXPECTED_STRIP_CONTEXT[url],
      );
    }
  });

  it("carries the strip controls/status claims exactly as modelled, per URL — RAW", () => {
    // Same discipline as the context assertion above: the RAW slot
    // contents are checked BEFORE the normaliser blanks them, so a route
    // that wrongly claims (or wrongly drops) a socket fails here first.
    for (const [url, { frame }] of getPages()) {
      const expected = EXPECTED_STRIP_CLAIMS[url];
      if (expected === undefined) throw new Error(`no strip model for ${url}`);

      const controls = extractStripSlot(frame, STRIP_CONTROLS_PATTERN);
      const status = extractStripSlot(frame, STRIP_STATUS_PATTERN);

      if (expected.controls) {
        // Structural, not a pinned string: the toolbar is present and is the
        // real one this lens claims, identified by its own slot marker
        // (definitions → `explorer-controls`, journeys → `journeys-view`).
        expect(controls, `controls on ${url}`).toContain(
          `data-slot="${expected.controls}"`,
        );
      } else {
        expect(controls, `controls on ${url} must be empty`).toBe("");
      }

      if (expected.status) {
        expect(status, `status on ${url}`).toContain(
          'data-slot="explorer-status"',
        );
      } else {
        expect(status, `status on ${url} must be empty`).toBe("");
      }
    }
  });

  it("frames are byte-identical once the accounted-for deltas are normalised", () => {
    const base = normalizeFrame(mustGet("/").frame);
    for (const url of MEASURED_URLS.slice(1)) {
      expect(normalizeFrame(mustGet(url).frame), `frame of ${url}`).toBe(base);
    }
  });

  it("the normaliser forgives nothing but the modelled deltas (its own teeth)", () => {
    const frame = mustGet("/components").frame;
    const perturbed = frame.replace(
      'data-region="primary-nav"',
      'data-region="primary-nav-tampered"',
    );
    expect(perturbed).not.toBe(frame);
    expect(normalizeFrame(perturbed)).not.toBe(normalizeFrame(frame));
  });

  it("the strip normaliser forgives the three claimed slots — and NOTHING else", () => {
    const frame = mustGet(BUTTON_ENTITY_URL).frame;

    // FORGIVEN, by design: content in each of the three claimed slots.
    // Blanking makes two different claims compare equal — which is
    // precisely why the RAW per-URL model assertions above exist, and why
    // this loosening is safe rather than merely convenient.
    for (const [label, changed] of [
      ["context", frame.replace(STRIP_CONTEXT_PATTERN, "$1Impostor$3")],
      [
        "controls",
        frame.replace(
          /(<div class="strip-controls" data-slot="controls">)(<\/div>)/,
          "$1planted$2",
        ),
      ],
      [
        "status",
        frame.replace(
          /(<div class="strip-status" data-slot="status">)(<\/div>)/,
          "$1planted$2",
        ),
      ],
    ] as const) {
      expect(changed, `${label} perturbation must alter the frame`).not.toBe(
        frame,
      );
      expect(
        normalizeFrame(changed),
        `${label} content is forgiven by the normaliser`,
      ).toBe(normalizeFrame(frame));
    }

    // NOT FORGIVEN — the widened normaliser's scope is those three slots,
    // never "the strip" and never the frame at large. Each of these
    // perturbations must survive normalisation and break byte-identity.
    // This is the control that keeps the R5 loosening honest: without it,
    // a normaliser that blanked the whole strip would pass every test
    // above.
    for (const [label, tampered] of [
      // The strip's own element, just outside the slots.
      [
        "strip region",
        frame.replace('data-region="mode-strip"', 'data-region="mode-strip-x"'),
      ],
      // A slot's own identity attributes — blanking contents must not
      // extend to forgiving a renamed or missing socket.
      [
        "controls slot identity",
        frame.replace('data-slot="controls"', 'data-slot="controls-x"'),
      ],
      [
        "status slot identity",
        frame.replace('data-slot="status"', 'data-slot="status-x"'),
      ],
      [
        "context slot identity",
        frame.replace('data-slot="context"', 'data-slot="context-x"'),
      ],
      // And the rest of the frame, unchanged from the original teeth test.
      [
        "primary nav",
        frame.replace(
          'data-region="primary-nav"',
          'data-region="primary-nav-tampered"',
        ),
      ],
      [
        "footer",
        frame.replace('data-region="footer"', 'data-region="footer-x"'),
      ],
    ] as const) {
      expect(tampered, `${label} perturbation must alter the frame`).not.toBe(
        frame,
      );
      expect(
        normalizeFrame(tampered),
        `${label} must NOT be forgiven by the normaliser`,
      ).not.toBe(normalizeFrame(frame));
    }
  });
});

/**
 * The 404 route, rendered at last (AV-334 gap #2). `notFoundRoute` is wired
 * into every router construction across six test files and was never
 * exercised by any of them.
 *
 * It is deliberately NOT a member of MEASURED_URLS. The frame
 * certification above measures pages mounted inside `publicLayout` — its
 * `splitAtCanvas` requires exactly one `<main data-region="canvas">`, which
 * is the Shell's. `notFoundRoute` is declared OUTSIDE the `group(...)`
 * wrappers in routes.tsx, so it renders bare: zero `<main>`, no rail, no
 * strip. Adding the URL to the measured set would fail that structural
 * assertion, and the only way to make it pass would be to loosen the
 * certification for every other URL. So the honest test is this one — it
 * pins what the 404 route ACTUALLY is today, including its unshelled-ness,
 * which is the fact a future reader most needs to know.
 */
describe("the not-found route renders (AV-334 gap #2)", () => {
  const body = extractBody(renderPage("/no-such-page"));

  it("renders the not-found copy for an unrouted URL", () => {
    expect(body).toContain("Page not found");
    expect(body).toContain("The page you are looking for does not exist.");
  });

  it("renders OUTSIDE the shell — no canvas plate, no chrome", () => {
    // The structural claim that keeps it out of MEASURED_URLS. If the 404
    // is ever moved inside `publicLayout` (a reasonable future change),
    // this fails loudly and points at the decision above rather than
    // letting the frame suite break mysteriously.
    expect(body.split("<main").length - 1).toBe(0);
    expect(body).not.toContain('data-region="primary-nav"');
    expect(body).not.toContain('data-region="canvas"');
  });

  it("renders content distinct from every measured lens canvas", () => {
    // The distinctness the brief asks for, stated against the real
    // structure: the 404 body matches no lens canvas.
    const canvases = [...getPages().values()].map(({ canvas }) => canvas);
    for (const canvas of canvases) {
      expect(canvas).not.toBe(body);
      expect(canvas).not.toContain("Page not found");
    }
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
