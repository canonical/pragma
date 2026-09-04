// @vitest-environment node

/**
 * End-to-end test of the build: boot each of the 2×3 server scripts and assert
 * it serves correctly over HTTP. The defects this guards against live at the
 * HTTP/content-type layer (assets served as text/html; a 500 page), so
 * fetch-level assertions catch them — no browser needed.
 *
 * Each cell runs its real package.json script — including the build that
 * `preview:*` performs — so the test mirrors the actual user experience. The
 * `dev*` cells boot in a second or two (tight readiness budget); the
 * `preview*` cells build the client + compile the renderer first, so they get a
 * larger budget. Kept out of the default `test` run via the `*.e2e.ts` name;
 * invoke with `bun run test:e2e`.
 */
import { describe, expect, it } from "vitest";
import { startServer } from "./serverHarness.js";

const CWD = process.cwd();

// Readiness budgets. Every cell now boots the GRAPH server first
// (`src/server/withGraph.ts`), and compiling the schema from the refs cache
// dominates a dev boot — so `dev*` no longer boots "straight away" and the
// old 20s budget would fail every cell on a cold cache for the wrong reason.
// preview* additionally builds the client + renderer before serving.
const DEV_READY_MS = 90_000;
const PREVIEW_READY_MS = 90_000;
// Readiness is only the start of a cell: the probe block then fetches a
// dozen server-rendered pages, each of which executes a real query. The
// margin over the readiness budget has to cover that, not just the boot.
const TEST_TIMEOUT_MS = PREVIEW_READY_MS + 60_000;

interface Cell {
  /** package.json script to run. */
  script: string;
  /** Readiness budget for this cell's boot (and build, for preview*). */
  timeoutMs: number;
  /**
   * Whether this cell server-renders. The plain `dev`/`preview` cells are the
   * Vite SPA path (no SSR), so they have no `/sitemap.xml` route; the four
   * `*:bun`/`*:express` cells render it from the sitemap renderer.
   */
  ssr: boolean;
  /**
   * Whether this cell serves its routes with server-executed Relay data.
   * ALL FOUR SSR cells do since the PRD-3 process split: the prepare step is
   * an HTTP client now, so the preview bricks can run it too (the
   * Oxigraph-bundle spike that used to gate them is closed — nothing WASM
   * enters `dist/server`). Requires the pragma refs cache (`pragma sources
   * update`), which is what the graph server compiles its schema from.
   */
  probe?: boolean;
}

const MATRIX: Cell[] = [
  { script: "dev", timeoutMs: DEV_READY_MS, ssr: false },
  { script: "dev:bun", timeoutMs: DEV_READY_MS, ssr: true, probe: true },
  { script: "dev:express", timeoutMs: DEV_READY_MS, ssr: true, probe: true },
  { script: "preview", timeoutMs: PREVIEW_READY_MS, ssr: false },
  {
    script: "preview:bun",
    timeoutMs: PREVIEW_READY_MS,
    ssr: true,
    probe: true,
  },
  {
    script: "preview:express",
    timeoutMs: PREVIEW_READY_MS,
    ssr: true,
    probe: true,
  },
];

/** A JS/TS module or CSS-as-JS asset must never come back as the HTML page. */
const JS_CONTENT_TYPE = /javascript/;

/**
 * The schema's hard per-page connection maximum (ke-graphql
 * MAX_PAGE_SIZE). Restated here rather than imported: this suite asserts
 * against the HTTP surface only and pulls in no app modules, so the
 * server under test stays a black box. It is a SCHEMA constant, not a
 * graph count — it does not drift with the data.
 */
const CONNECTION_PAGE_CAP = 100;

/**
 * How many exemplars the lobby's strip asks the graph for (mirrors
 * `LOBBY_EXEMPLAR_COUNT` in `#domains/marketing/lobbyQuery.js`). Same
 * black-box rationale; a change there without a change here fails loudly
 * in the home block below, which is the intent.
 */
const LOBBY_EXEMPLAR_COUNT = 6;

/**
 * The per-request line the GRAPH server logs — keep in sync with
 * `src/server/graph.ts`. Each line ends in `ssr` or `client`, and that word
 * is the whole assertion: before the process split the web server mounted
 * `/graphql` itself and a server render made ZERO hits (it executed
 * in-process), so absence was the proof. Now every render goes over the wire
 * and the proof INVERTS — many `ssr` hits, no `client` ones, on a load where
 * no browser JS has run.
 */
const GRAPHQL_HIT_MARKER = "[graphql] http hit";

// Hit counting lives in the harness (`server.hits(source)`), tallied
// incrementally per log line — counting by regex over `logs()` here would
// under-count whenever the bounded tail truncates: a failing-prepare probe
// sequence emits ~92 KB and scrolls early hit lines out of the 16 KB tail.

/** Poll the server log until `marker` appears (child stdout is async). */
async function waitForLog(
  server: { logs: () => string },
  marker: string,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!server.logs().includes(marker)) {
    if (Date.now() > deadline) {
      throw new Error(
        `log marker ${JSON.stringify(marker)} not seen within ${timeoutMs}ms`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Poll until the graph's hit counter shows `count` of `source`, or time out. */
async function waitForHits(
  server: { hits: (source: "ssr" | "client") => number },
  source: "client" | "ssr",
  count: number,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (server.hits(source) < count) {
    if (Date.now() > deadline) {
      throw new Error(
        `only ${server.hits(source)} ${source} hits seen within ${timeoutMs}ms (wanted ${count})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe("server matrix (2×3) serves correctly", () => {
  for (const cell of MATRIX) {
    it(
      `${cell.script} serves an HTML page and JS assets (not HTML)`,
      async () => {
        const server = await startServer(cell.script, CWD, {
          timeoutMs: cell.timeoutMs,
        });
        try {
          // 1. The document renders.
          const page = await fetch(`${server.base}/`);
          expect(page.status).toBe(200);
          expect(page.headers.get("content-type")).toMatch(/text\/html/);
          const html = await page.text();
          expect(html).toContain('id="root"');

          // 2. The HTML references at least one client script.
          const scriptSrc = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
          expect(
            scriptSrc,
            "page should reference a client script",
          ).toBeTruthy();

          // 3. That script is served as JavaScript — never the HTML page.
          //    (This is the exact defect: assets returned with a text/html MIME.)
          const asset = await fetch(new URL(scriptSrc as string, server.base));
          expect(asset.status).toBe(200);
          expect(asset.headers.get("content-type")).toMatch(JS_CONTENT_TYPE);

          // 4. SSR cells render /sitemap.xml as XML from the sitemap renderer —
          //    the second renderer, picked by path, never the HTML app. (The SPA
          //    dev/preview cells have no SSR route, so they are exempt.)
          if (cell.ssr) {
            const sitemap = await fetch(`${server.base}/sitemap.xml`);
            expect(sitemap.status).toBe(200);
            expect(sitemap.headers.get("content-type")).toMatch(/xml/);
            const xml = await sitemap.text();
            expect(xml).toContain("<urlset");
            expect(xml).toContain("<loc>");

            // 4b. The shell frame SSRs through the real pipeline (P-4.1):
            //     the page fetched in step 1 already carries the rail and
            //     the canvas plate's structural identity. SPA cells serve
            //     the empty HTML shell, so they are exempt.
            expect(html).toContain('data-region="primary-nav"');
            expect(html).toContain('data-region="canvas"');
          }

          // 5. /playground carries the probe's REAL graph data in the raw
          //    HTML (no client JS ran) and the serialised store rides
          //    __INITIAL_DATA__.relay — all of it fetched by the server from
          //    the graph process over HTTP.
          if (cell.probe) {
            // 5-pre. THE PRECONDITION, stated as an assertion rather than a
            //    skip. Every literal below is a claim about GRAPH DATA, so
            //    without a graph they all fail for the same uninformative
            //    reason ("expected … to contain <h2>Button</h2>"). Asserting
            //    the graph is up first makes the failure self-diagnosing.
            //    Deliberately NOT a `skipIf`: a machine with no refs cache
            //    must see red, not a quietly green suite that proved
            //    nothing.
            const graphUp = await fetch(`${server.graphBase}/graphql`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-pragma-ssr": "1",
              },
              body: JSON.stringify({ query: "{ __typename }" }),
            }).catch(() => undefined);
            expect(
              graphUp?.status,
              `graph server must be serving at ${server.graphBase}/graphql — populate ~/.cache/pragma/refs with \`pragma sources update\` (or point PRAGMA_REFS_DIR at a cache), then re-run`,
            ).toBe(200);
            expect(graphUp?.headers.get("content-type")).toMatch(
              /application\/json/,
            );

            // 5-pre-bis. The graph process serves ONLY /graphql: anything
            //    else is a JSON 404, never HTML. Half one of the
            //    content-type guard — a consumer pointed at the wrong
            //    process must fail on content type, not silently parse a
            //    page.
            const graphStray = await fetch(`${server.graphBase}/playground`);
            expect(graphStray.status).toBe(404);
            expect(graphStray.headers.get("content-type")).toMatch(
              /application\/json/,
            );
            expect(graphStray.headers.get("content-type")).not.toMatch(
              /text\/html/,
            );

            const playground = await fetch(`${server.base}/playground`);
            expect(playground.status).toBe(200);
            const playgroundHtml = await playground.text();
            // Server-rendered probe content: heading, URI, summary text.
            expect(playgroundHtml).toContain("<h2>Button</h2>");
            expect(playgroundHtml).toContain("ds:global.component.button");
            expect(playgroundHtml).toContain(
              "Buttons trigger actions within an interface",
            );
            // Modifier families too: every field the unit fixture
            // (componentProbeRecords) freezes is asserted against the live
            // graph here, so an upstream rename rots loudly, not silently.
            expect(playgroundHtml).toContain("Anticipation");
            expect(playgroundHtml).toContain("Importance");
            // The serialised record map is embedded for hydration.
            expect(playgroundHtml).toContain("__INITIAL_DATA__");
            expect(playgroundHtml).toContain('"relay"');
            expect(playgroundHtml).toContain('"records"');

            // 5b. P-5: the Components lens SSRs from the live graph too.
            //     These are the live-graph tripwires for the unit
            //     fixtures' frozen fields (Stage-1 split): an upstream
            //     rename rots loudly here, not silently.
            //     The catalog carries real cards and encoded entity hrefs
            //     in the raw HTML plus the serialised store.
            const catalog = await fetch(`${server.base}/components`);
            expect(catalog.status).toBe(200);
            const catalogHtml = await catalog.text();
            expect(catalogHtml).toContain("Accordion");
            // A Sites-tier card — the tier grouping spans the live graph,
            // not just Global (the unit fixtures freeze this field).
            expect(catalogHtml).toContain("Quote");
            expect(catalogHtml).toContain(
              'href="/components/ds%3Aglobal.component.accordion"',
            );
            expect(catalogHtml).toContain("__INITIAL_DATA__");
            expect(catalogHtml).toContain('"records"');

            //     The Button entity page: properties (incl. the raw
            //     variantSpecial name) and both modifier families.
            const buttonEntity = await fetch(
              `${server.base}/components/ds%3Aglobal.component.button`,
            );
            expect(buttonEntity.status).toBe(200);
            const buttonHtml = await buttonEntity.text();
            expect(buttonHtml).toContain("Button");
            expect(buttonHtml).toContain("variantSpecial");
            expect(buttonHtml).toContain("Anticipation");
            expect(buttonHtml).toContain("Importance");
            // Live-graph tripwires for fields the unit fixtures freeze:
            // the summary text, a property row, and the tier name.
            expect(buttonHtml).toContain("Buttons trigger actions");
            expect(buttonHtml).toContain("size");
            expect(buttonHtml).toContain("Global");

            //     The Card entity page: populated subcomponents.
            const cardEntity = await fetch(
              `${server.base}/components/ds%3Aglobal.component.card`,
            );
            expect(cardEntity.status).toBe(200);
            const cardHtml = await cardEntity.text();
            expect(cardHtml).toContain("Card.Content");
            // A second subcomponent — the list, not just one row.
            expect(cardHtml).toContain("Card.Header");

            // 5c. Definitions block (P-5): the ontology explorer SSRs
            //     from the live graph. The term page carries the
            //     inspector's class record, the React Flow well's
            //     server-rendered node DOM, and the serialised store —
            //     all in the raw HTML, before any client JS.
            const definitionsTerm = await fetch(
              `${server.base}/definitions/ds%3AUIBlock`,
            );
            expect(definitionsTerm.status).toBe(200);
            const definitionsTermHtml = await definitionsTerm.text();
            expect(definitionsTermHtml).toContain("UI Block");
            expect(definitionsTermHtml).toContain("ds:UIBlock");
            expect(definitionsTermHtml).toContain("react-flow__node-term");
            expect(definitionsTermHtml).toContain("__INITIAL_DATA__");
            expect(definitionsTermHtml).toContain('"records"');

            //     The term-less explorer: the full triptych with the
            //     honest empty inspector (no default term, no redirect).
            const definitions = await fetch(`${server.base}/definitions`);
            expect(definitions.status).toBe(200);
            const definitionsHtml = await definitions.text();
            expect(definitionsHtml).toContain('data-slot="explorer-rail"');
            expect(definitionsHtml).toContain("Select a term");
            expect(definitionsHtml).toContain("__INITIAL_DATA__");
            expect(definitionsHtml).toContain('"records"');

            // 5d. Silent-rot closures (the AV-330 review round). The
            //     well's node/edge DOM could rot to zero or partial while
            //     every literal above still matched. Never pin graph
            //     counts (the components lens's 111→108 lesson) — instead:
            //     the well draws exactly one node per class the rail
            //     lists, so the node count must equal the rail's
            //     class-link count, both derived from THIS response
            //     (drift-proof, catches a partial well). Floors catch the
            //     both-surfaces-rot-to-zero case the equality alone would
            //     wave through (0 === 0), and edges stay strictly below
            //     nodes — each edge is one non-root class's superclass
            //     link, and every non-empty ontology has a root.
            const wellNodeCount = (
              definitionsTermHtml.match(/react-flow__node-term/g) ?? []
            ).length;
            const wellEdgeCount = (
              definitionsTermHtml.match(/react-flow__edge-path/g) ?? []
            ).length;
            const railClassLinkCount =
              // The headings now carry a match count ("Classes 17 of 17"),
              // so the opening tag is matched loosely up to its close.
              (
                definitionsTermHtml.match(
                  /<h3>Classes[\s\S]*?<h3>Properties/g,
                ) ?? []
              )
                .map(
                  (section) =>
                    (section.match(/href="\/definitions\//g) ?? []).length,
                )
                .reduce((sum, count) => sum + count, 0);
            expect(wellNodeCount).toBe(railClassLinkCount);
            expect(wellNodeCount).toBeGreaterThan(20);
            expect(wellEdgeCount).toBeGreaterThan(10);
            expect(wellEdgeCount).toBeLessThan(wellNodeCount);

            // 5d-bis (AV-274). The exhibit's heuristics, asserted against
            // the LIVE graph rather than a fixture.
            //
            //   THE SELECTION'S EGO-FADE IS SERVER-RENDERED. The term is
            //   in the URL, so the fade is a pure function of data both
            //   sides hold and belongs in the first paint. Some nodes fade
            //   and some do NOT — a fade that swallowed everything would
            //   convey nothing, so the spared one-hop neighbourhood is
            //   what proves the rule is a neighbourhood and not a wash.
            const fadedNodeCount = (
              definitionsTermHtml.match(
                /react-flow__node-term[^"]*is-faded/g,
              ) ?? []
            ).length;
            expect(fadedNodeCount).toBeGreaterThan(0);
            expect(fadedNodeCount).toBeLessThan(wellNodeCount);
            expect(definitionsTermHtml).toContain("is-selected");

            //   …and the term-LESS address fades nothing, because nothing
            //   is selected. Same graph, no privileged centre.
            expect(definitionsHtml).not.toContain("is-faded");
            expect(definitionsHtml).not.toContain("is-selected");

            //   THE RAIL DIMS, IT NEVER HIDES. Server-side the filter is
            //   the no-op, so no rail item may carry the dim marker while
            //   every class the well draws is still listed (asserted by
            //   the equality above). The marker itself must exist in the
            //   stylesheet's vocabulary — proven by the chips below.
            expect(definitionsTermHtml).not.toContain('data-dimmed="true"');

            //   THE STRIP IS CLAIMED AND USEFUL (R5): both sockets carry
            //   real content in the server HTML, the chips offer one per
            //   live ontology, and the status figure counts real classes.
            expect(definitionsTermHtml).toContain(
              'data-slot="explorer-controls"',
            );
            expect(definitionsTermHtml).toContain(
              'data-slot="explorer-status"',
            );
            const chipCount = (
              definitionsTermHtml.match(/class="explorer-chip"/g) ?? []
            ).length;
            // Two abstraction chips plus one per ontology (three live).
            expect(chipCount).toBeGreaterThanOrEqual(4);
            // The figure's counts agree with the graph the well drew, so
            // the figure can never flatter the graph. Both sides derive
            // from THIS response — no pinned graph counts (the components
            // lens's 111→108 lesson): the abstract tally is read off the
            // well's own ABSTRACT tags.
            const statusCaption = /<figcaption>([\s\S]*?)<\/figcaption>/
              .exec(definitionsTermHtml)?.[1]
              ?.replaceAll("<!-- -->", "");
            const abstractNodeCount = (
              definitionsTermHtml.match(/hierarchy-node-tag/g) ?? []
            ).length;
            expect(abstractNodeCount).toBeGreaterThan(0);
            // Unfiltered server render: visible === total, and the
            // abstract clause matches the tags the graph actually drew.
            expect(statusCaption).toBe(
              `${wellNodeCount} of ${wellNodeCount} classes · ${abstractNodeCount} abstract`,
            );

            //   THE FURNITURE floats over the canvas (the legend and the
            //   hint), and abstract classes are marked in real text.
            expect(definitionsTermHtml).toContain("hierarchy-legend");
            expect(definitionsTermHtml).toContain("hierarchy-hint");
            expect(definitionsTermHtml).toContain("hierarchy-node-tag");

            //     The class inspector's relations and property rows SSR
            //     from the live graph: `hasVariant` is a ds:UIBlock
            //     ClassProperty the unit fixture freezes, so an upstream
            //     rename rots loudly here, not silently.
            expect(definitionsTermHtml).toContain("Superclasses");
            expect(definitionsTermHtml).toContain("hasVariant");

            //     The property view (the term lookup's other arm)
            //     resolves live:
            const definitionsProperty = await fetch(
              `${server.base}/definitions/ds%3AhasSubcomponent`,
            );
            expect(definitionsProperty.status).toBe(200);
            const definitionsPropertyHtml = await definitionsProperty.text();
            expect(definitionsPropertyHtml).toContain("ds:hasSubcomponent");
            expect(definitionsPropertyHtml).toContain("Functional");
            expect(definitionsPropertyHtml).toContain("Inverse");

            //     Instance links land on the components lens (the D31
            //     landing rule), proved against the live graph:
            const definitionsClass = await fetch(
              `${server.base}/definitions/ds%3AComponent`,
            );
            expect(definitionsClass.status).toBe(200);
            const definitionsClassHtml = await definitionsClass.text();
            expect(definitionsClassHtml).toMatch(
              /href="\/components\/ds%3A[^"]+"/,
            );

            //     …and the third ontology rides the explorer's rail:
            expect(definitionsHtml).toMatch(/href="\/definitions\/anatomy%3A/);

            // 5e. Standards block (P-5): the reading lens SSRs from the
            //     live graph — now through the TBox (`ontologyClass(uri:)
            //     .instances`) rather than a `codeStandards` root field.
            //     THIS BLOCK COULD NOT BE RUN WHEN IT WAS REWRITTEN: the
            //     `code-standards` reference package is absent from the
            //     despecialisation environment, so the graph cannot be
            //     booted with the `cs:` vocabulary at all. It is written
            //     to be drift-proof rather than to be re-pinned, and CI is
            //     where it is first executed.
            const standardsIndex = await fetch(`${server.base}/standards`);
            expect(standardsIndex.status).toBe(200);
            const standardsIndexHtml = await standardsIndex.text();
            //     At least one group section, addressed by its CLASS.
            expect(standardsIndexHtml).toMatch(
              /<section[^>]*id="standards-group-/,
            );
            //     The D31 href check: a live standard's index link is the
            //     percent-encoded ABSOLUTE IRI — the only address
            //     `node(id:)` accepts.
            expect(standardsIndexHtml).toMatch(
              /href="\/standards\/http%3A%2F%2Fpragma\.canonical\.com%2Fcodestandards%23code\.array\.safe_access"/,
            );
            expect(standardsIndexHtml).toContain("__INITIAL_DATA__");
            expect(standardsIndexHtml).toContain('"records"');

            //     Silent-rot closure, drift-proof by design (never pin
            //     graph counts — the 111→108 lesson). Grouping is now by
            //     the instance's own CLASS, and `cs:CodeStandard` may well
            //     have no subclasses, so the honest invariant is: the
            //     jump-link rail lists one anchor per group section when
            //     there is more than one group, and NO rail at all when
            //     there is exactly one (a one-item secondary nav is
            //     noise). Sections stay strictly below standard links — a
            //     group exists only because standards fill it.
            const groupJumpLinkCount = (
              standardsIndexHtml.match(/href="#standards-group-/g) ?? []
            ).length;
            const groupSectionCount = (
              standardsIndexHtml.match(/<section[^>]*id="standards-group-/g) ??
              []
            ).length;
            const standardLinkCount = (
              standardsIndexHtml.match(
                /href="\/standards\/http%3A%2F%2Fpragma/g,
              ) ?? []
            ).length;
            expect(groupJumpLinkCount).toBe(
              groupSectionCount > 1 ? groupSectionCount : 0,
            );
            expect(groupSectionCount).toBeGreaterThan(0);
            expect(standardLinkCount).toBeGreaterThan(50);
            expect(groupSectionCount).toBeLessThan(standardLinkCount);

            //     A real reading page: the prose tripwire for the text the
            //     unit fixture freezes (it SSRs verbatim — an upstream
            //     rename rots loudly here) and the layout.reading anchor.
            //     The prose now arrives through `_meta.definition` rather
            //     than `CodeStandard.description`, which is the one thing
            //     in this block that a live boot must confirm: the
            //     compiler's local-name fallback tier says `description`
            //     lands there, and if it does not, the fix is a
            //     `graphql:definitionFrom` annotation upstream.
            const standardReading = await fetch(
              `${server.base}/standards/${encodeURIComponent(
                "http://pragma.canonical.com/codestandards#react.component.link_component",
              )}`,
            );
            expect(standardReading.status).toBe(200);
            const standardReadingHtml = await standardReading.text();
            expect(standardReadingHtml).toContain("LinkComponentProps");
            expect(standardReadingHtml).toContain('data-slot="reading-canvas"');
            expect(standardReadingHtml).toContain("__INITIAL_DATA__");
            expect(standardReadingHtml).toContain('"records"');

            //     Three more silent-rot closures (the AV-334 round), all
            //     on HTML already fetched above:
            //     (a) the COMPACT identity. The link text is `_meta.title`
            //     and the href is the absolute IRI, so without this the
            //     reader could lose the `cs:` form entirely while every
            //     href assertion still passed.
            expect(standardsIndexHtml).toContain(">cs:code.array.safe_access<");
            //     (b) the reading page's class line — the article's one
            //     piece of graph metadata outside the prose, and what
            //     replaced the category line when `categories` turned out
            //     to be untraversable through the contract. React splits
            //     the text node, hence the comment marker.
            expect(standardReadingHtml).toContain("class: <!-- -->");
            //     (c) the pagination affordance. The live graph carries
            //     131 standards against this app's 100-item page size, so
            //     `hasNextPage` is true and the button MUST render. If the
            //     graph ever drops below the page size the button vanishes
            //     and R1's load-bearing claim quietly stops being true —
            //     this makes that a failure, not a shrug.
            expect(standardsIndexHtml).toContain("Load more");

            // 5f. Home block (AV-350): the lobby SSRs from the live
            //     graph — the front door is the last route to come over
            //     it. Two projections, both asserted DRIFT-PROOF: never
            //     a pinned graph number (the 111→108 lesson), only
            //     structure, floors, and cross-checks against THIS same
            //     response.
            const home = await fetch(`${server.base}/`);
            expect(home.status).toBe(200);
            const homeHtml = await home.text();
            //     All three layout.lobby slots reached the HTML.
            expect(homeHtml).toContain('data-slot="hero"');
            expect(homeHtml).toContain('data-slot="examples"');
            expect(homeHtml).toContain('data-slot="doors"');
            expect(homeHtml).toContain("__INITIAL_DATA__");
            expect(homeHtml).toContain('"records"');

            //     Projection 1 — the exemplar strip. The strip asks the
            //     graph for exactly LOBBY_EXEMPLAR_COUNT instances, so
            //     the rendered link count must equal it: fewer means the
            //     projection partially rendered, more means it stopped
            //     honouring its own page size. Derived from this
            //     response, not from a captured fixture.
            const exemplarLinkCount = (
              homeHtml.match(/href="\/components\/ds%3A/g) ?? []
            ).length;
            expect(exemplarLinkCount).toBe(LOBBY_EXEMPLAR_COUNT);

            //     Projection 2 — the doors' honest counts. THE
            //     load-bearing assertion of the whole block: the
            //     standards figure is read off `instanceCount`, and the
            //     entity connections cap at 100 per page, so a figure
            //     ABOVE the cap could not have come from counting edges. Were a future edit to swap the source to a
            //     connection count, the number would silently collapse
            //     to at most 100 and this snaps. The floor is the cap
            //     itself — never the live total.
            const standardsFigure = homeHtml.match(
              /The graph holds <!-- -->(\d+)<!-- --> of them/,
            );
            expect(standardsFigure).not.toBeNull();
            expect(Number(standardsFigure?.[1])).toBeGreaterThan(
              CONNECTION_PAGE_CAP,
            );

            //     The components/patterns figures render as a pair and
            //     are internally ordered: the graph holds more
            //     components than patterns (components are the larger
            //     class by construction — patterns compose them), and
            //     both are non-trivial. Structural bounds, no pins.
            const componentsFigure = homeHtml.match(
              /The graph holds <!-- -->(\d+)<!-- --> components and <!-- -->(\d+)<!-- -->/,
            );
            expect(componentsFigure).not.toBeNull();
            const liveComponentCount = Number(componentsFigure?.[1]);
            const livePatternCount = Number(componentsFigure?.[2]);
            expect(liveComponentCount).toBeGreaterThan(50);
            expect(livePatternCount).toBeGreaterThan(10);
            expect(livePatternCount).toBeLessThan(liveComponentCount);

            //     The Definitions door is named WITHOUT a count (no
            //     cheap honest count exists for a lens whose quantity is
            //     "terms across ontologies"). If someone later invents
            //     one, this is the tripwire — the door's own list item
            //     must stay digit-free.
            const definitionsDoor = homeHtml.match(
              /<a href="\/definitions">Definitions<\/a><p>([\s\S]*?)<\/p>/,
            );
            expect(definitionsDoor).not.toBeNull();
            expect(definitionsDoor?.[1]).not.toMatch(/\d/);

            // 5g. Journeys block (AV-351): the demand model SSRs from
            //     the live graph. Every assertion here is DRIFT-PROOF —
            //     never a pinned graph count (the 111->108 lesson, and
            //     ds:Component drifted again today) — so counts are
            //     either derived from THIS response and related to each
            //     other, or bounded by SCHEMA constants.
            const journeys = await fetch(`${server.base}/journeys`);
            expect(journeys.status).toBe(200);
            const journeysHtml = await journeys.text();
            expect(journeysHtml).toContain('data-slot="journeys-rail"');
            expect(journeysHtml).toContain('data-slot="journeys-canvas"');
            expect(journeysHtml).toContain('data-slot="journeys-inspector"');
            //     The index's honest empty inspector (no default job).
            expect(journeysHtml).toContain("Select a job");
            expect(journeysHtml).toContain("__INITIAL_DATA__");
            expect(journeysHtml).toContain('"records"');

            //     THE PRIMARY SURFACE, in the server HTML (AV-351). The
            //     table is the lens's index now, and it SSRs whole: its
            //     slot, its accessible structure (a row-header cell per
            //     job, sortable column headers via aria-sort) and its
            //     group-by control are all in the served markup, before any
            //     client JS. A sortable data table that only becomes one
            //     after hydration would fail a reader without JS; this
            //     proves the table is real at first paint.
            expect(journeysHtml).toContain('data-slot="journeys-table"');
            expect(journeysHtml).toContain('scope="row"');
            expect(journeysHtml).toMatch(/aria-sort="(ascending|descending)"/);
            expect(journeysHtml).toContain("Group by");
            //     THE DEFAULT SORT is in the server HTML, not applied later:
            //     the table's caption states its live row count, so the
            //     first paint carries the deterministic default arrangement
            //     the pure constant names.
            expect(journeysHtml).toContain("Every job in the demand model");

            //     DRIFT-PROOF COUNT RELATION (the ds:Component 108→111
            //     lesson): never pin the model size. The table's row-header
            //     cells and the rail's job links both index EVERY job in the
            //     model, from the SAME response — so they must be equal.
            //     This survives the model growing; it breaks only if the
            //     table and the rail fall out of step, which is the real
            //     failure worth catching.
            const tableRowHeaderCount = (
              journeysHtml.match(/class="journey-table-job"/g) ?? []
            ).length;
            const railJobLinkCountIndex = (
              journeysHtml.match(/class="journey-rail-job"/g) ?? []
            ).length;
            expect(tableRowHeaderCount).toBeGreaterThan(0);
            expect(tableRowHeaderCount).toBe(railJobLinkCountIndex);

            //     THE PERSONA AXIS CONFESSES, in the server HTML. The
            //     graph records no persona-to-job edge, so the filter is
            //     approximate and the interface says so as real text. If
            //     that caveat is ever dropped while the filter stays,
            //     the lens starts quietly overstating what it knows.
            expect(journeysHtml).toContain("Approximate");

            //     A JOB URL renders the selected journey. The address is
            //     the job (P-D7), and the view it lands on must contain
            //     that job — the diagram roots at its coordinate.
            const journeyJob = await fetch(
              `${server.base}/journeys/sem%3A%2F%2Fdesign-system-docs%23job.l3`,
            );
            expect(journeyJob.status).toBe(200);
            const journeyJobHtml = await journeyJob.text();
            //     The story renders VERBATIM — the demand in the
            //     reader's own words is the whole point of the model, so
            //     an upstream rewording rots loudly here.
            expect(journeyJobHtml).toContain(
              "I want to browse and filter the full catalog",
            );
            expect(journeyJobHtml).toContain('id="journey-inspector-title"');
            //     Selection is server-rendered, because it comes from
            //     the URL — exactly one node carries the marker.
            expect((journeyJobHtml.match(/is-selected/g) ?? []).length).toBe(1);

            //     Silent-rot closures, all derived from THIS response.
            //     The well draws a left-to-right spine, so every node
            //     beyond the first column is reached by an edge: edges
            //     must be at least nodes minus the columns, and nodes
            //     must be non-trivial. Floors catch the both-rot-to-zero
            //     case that a bare equality would wave through.
            const hopNodeCount = (
              journeyJobHtml.match(/react-flow__node-hop/g) ?? []
            ).length;
            const hopEdgeCount = (
              journeyJobHtml.match(/react-flow__edge-path/g) ?? []
            ).length;
            expect(hopNodeCount).toBeGreaterThan(5);
            expect(hopEdgeCount).toBeGreaterThan(5);
            //     A connected spine has strictly fewer roots than nodes.
            expect(hopEdgeCount).toBeLessThan(hopNodeCount * 2);

            //     HONEST ABSENCE (ruling R2), asserted against the LIVE
            //     graph rather than a fixture: 50 of the 59 paired
            //     surfaces compose no layout, so at least one row in any
            //     real view ends at its surface — and the inspector says
            //     so in words rather than leaving a blank.
            expect(journeyJobHtml).toContain("composes no layout");

            //     The rail is the complete index and it DIMS rather than
            //     hides: the job-less view lists strictly more jobs than
            //     the filtered diagram draws, both counted from their own
            //     responses. (The rail links every job in the model; the
            //     well draws one coordinate's worth by default.)
            const railJobLinkCount = (
              journeysHtml.match(/class="journey-rail-job"/g) ?? []
            ).length;
            const drawnNodeCount = (
              journeysHtml.match(/react-flow__node-hop/g) ?? []
            ).length;
            expect(railJobLinkCount).toBeGreaterThan(drawnNodeCount);
            //     …and the model is big enough that the default view is
            //     genuinely a narrowing, which is the scale ruling's
            //     whole premise.
            expect(railJobLinkCount).toBeGreaterThan(40);

            // 5h. WHO MADE THE REQUESTS. Everything above was fetched with
            //     plain `fetch` — no browser, no client JS — yet a dozen
            //     data-bearing pages rendered real graph data. So the graph
            //     must have been hit MANY times by the SERVER and NEVER by a
            //     client. That inversion is the process split's whole
            //     claim, and it is what the `ssr` / `client` word on each
            //     hit line exists to prove.
            //
            //     Deliberately no exact N: the page count drifts with the
            //     routes, and pinning it would break on every new lens (the
            //     111→108 lesson, applied to request counts).
            await waitForLog(server, GRAPHQL_HIT_MARKER);
            const ssrHits = server.hits("ssr");
            const clientHitsBefore = server.hits("client");
            expect(ssrHits).toBeGreaterThan(5);
            expect(clientHitsBefore).toBe(0);

            // Teeth, as a STRICT DELTA: a direct POST with no `x-pragma-ssr`
            // header is what a browser looks like, and it must move the
            // client counter by exactly one. Without this the zero above
            // could be vacuous (a counter that never counts anything reads
            // as zero forever).
            const graphqlResponse = await fetch(`${server.graphBase}/graphql`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: "{ __typename }" }),
            });
            expect(graphqlResponse.status).toBe(200);
            const graphqlBody = (await graphqlResponse.json()) as {
              data?: { __typename?: string };
            };
            expect(graphqlBody.data?.__typename).toBe("Query");
            await waitForHits(server, "client", clientHitsBefore + 1);
            // Counters grow from async pipe chunks, so give trailing chunks
            // a beat to flush before asserting nothing ELSE arrived.
            await new Promise((resolve) => setTimeout(resolve, 200));
            expect(server.hits("client")).toBe(clientHitsBefore + 1);

            // 5i. The other half of the content-type guard: the WEB server
            //     no longer serves `/graphql` at all — it does not proxy it,
            //     which would re-establish the coupling the split removed.
            //     A stray POST there falls through to the app renderer and
            //     comes back as HTML, and it must NOT be counted as a graph
            //     hit.
            const strayPost = await fetch(`${server.base}/graphql`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: "{ __typename }" }),
            });
            expect(strayPost.headers.get("content-type")).toMatch(/text\/html/);
            expect(strayPost.headers.get("content-type")).not.toMatch(
              /application\/json/,
            );
            await new Promise((resolve) => setTimeout(resolve, 200));
            expect(server.hits("client")).toBe(clientHitsBefore + 1);
          }
        } finally {
          await server.stop();
        }
      },
      TEST_TIMEOUT_MS,
    );
  }
});
