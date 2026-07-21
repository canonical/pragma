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

// Readiness budgets: dev* boots straight away; preview* builds the client +
// renderer before serving, so it needs a larger budget.
const DEV_READY_MS = 20_000;
const PREVIEW_READY_MS = 90_000;
const TEST_TIMEOUT_MS = PREVIEW_READY_MS + 30_000;

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
   * Whether this cell serves `/playground` with server-executed Relay data
   * (P-2 Stage 1). Only the two dev SSR cells so far: the preview cells have
   * no graph backend until the Oxigraph-bundle spike closes. Requires the
   * pragma refs cache (`pragma sources update`), like the `/graphql`
   * endpoint those cells already mount.
   */
  probe?: boolean;
}

const MATRIX: Cell[] = [
  { script: "dev", timeoutMs: DEV_READY_MS, ssr: false },
  { script: "dev:bun", timeoutMs: DEV_READY_MS, ssr: true, probe: true },
  { script: "dev:express", timeoutMs: DEV_READY_MS, ssr: true, probe: true },
  { script: "preview", timeoutMs: PREVIEW_READY_MS, ssr: false },
  { script: "preview:bun", timeoutMs: PREVIEW_READY_MS, ssr: true },
  { script: "preview:express", timeoutMs: PREVIEW_READY_MS, ssr: true },
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
 * The per-request line the dev servers' `/graphql` bricks log — keep in sync
 * with `server.bun.ts` / `server.express.ts`. Its absence after a page load
 * is the "zero HTTP hits" proof; its appearance after a direct POST proves
 * the counter (and the endpoint) still works.
 */
const GRAPHQL_HIT_MARKER = "[graphql] http hit";

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

          // 5. P-2 Stage 1: /playground carries the probe's REAL graph data in
          //    the raw HTML (no client JS ran), the serialised store rides
          //    __INITIAL_DATA__.relay, and the whole load made ZERO HTTP
          //    /graphql requests — the query executed in-process.
          if (cell.probe) {
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
            //     live graph. The index carries the category-grouped
            //     lists and D31-addressed reading links in the raw HTML
            //     plus the serialised store.
            const standardsIndex = await fetch(`${server.base}/standards`);
            expect(standardsIndex.status).toBe(200);
            const standardsIndexHtml = await standardsIndex.text();
            expect(standardsIndexHtml).toContain(
              'id="standards-category-code"',
            );
            //     The D31 href check: a live standard's index link IS the
            //     chip address (percent-encoded prefixed URI).
            expect(standardsIndexHtml).toContain(
              'href="/standards/cs%3Acode.array.safe_access"',
            );
            expect(standardsIndexHtml).toContain("__INITIAL_DATA__");
            expect(standardsIndexHtml).toContain('"records"');

            //     Silent-rot closure, drift-proof by design (never pin
            //     graph counts — the 111→108 lesson): the jump-link rail
            //     lists exactly one anchor per category section, both
            //     derived from THIS response, so a partial render of
            //     either surface breaks the equality. Floors catch the
            //     both-rot-to-zero case (0 === 0), and sections stay
            //     strictly below standard links — a category exists only
            //     because standards fill it.
            const categoryJumpLinkCount = (
              standardsIndexHtml.match(/href="#standards-category-/g) ?? []
            ).length;
            const categorySectionCount = (
              standardsIndexHtml.match(
                /<section[^>]*id="standards-category-/g,
              ) ?? []
            ).length;
            const standardLinkCount = (
              standardsIndexHtml.match(/href="\/standards\/cs%3A/g) ?? []
            ).length;
            expect(categoryJumpLinkCount).toBe(categorySectionCount);
            expect(categorySectionCount).toBeGreaterThan(5);
            expect(standardLinkCount).toBeGreaterThan(50);
            expect(categorySectionCount).toBeLessThan(standardLinkCount);

            //     A real reading page: the prose tripwire for the field
            //     the unit fixture freezes (the description text SSRs
            //     verbatim — an upstream rename rots loudly here), the
            //     layout.reading anchor, and the extends cross-link.
            const standardReading = await fetch(
              `${server.base}/standards/cs%3Areact.component.link_component`,
            );
            expect(standardReading.status).toBe(200);
            const standardReadingHtml = await standardReading.text();
            expect(standardReadingHtml).toContain("LinkComponentProps");
            expect(standardReadingHtml).toContain('data-slot="reading-canvas"');
            expect(standardReadingHtml).toContain(
              'href="/standards/cs%3Areact.component.props"',
            );
            expect(standardReadingHtml).toContain("__INITIAL_DATA__");
            expect(standardReadingHtml).toContain('"records"');

            //     Three more silent-rot closures (the AV-334 round), all
            //     on HTML already fetched above:
            //     (a) the name-over-uri FALLBACK. 127 of 131 live
            //     standards carry no display name, so the index renders
            //     the prefixed URI AS the link text. Were `name` to start
            //     resolving upstream (or the fallback to be dropped), the
            //     href assertions above would all still pass while the
            //     visible text changed silently. This pins the text form.
            expect(standardsIndexHtml).toContain(">cs:code.array.safe_access<");
            //     (b) the reading page's category line — the article's
            //     one piece of graph metadata outside the prose. React
            //     splits the text node, hence the comment marker.
            expect(standardReadingHtml).toContain("category: <!-- -->react");
            //     (c) the pagination affordance. The live graph carries
            //     131 standards against the schema's hard 100-item cap, so
            //     `hasNextPage` is true and the button MUST render. If the
            //     graph ever drops below the cap the button vanishes and
            //     R1's load-bearing claim quietly stops being true — this
            //     makes that a failure, not a shrug.
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
            //     codeStandards connection caps at 100 per page, so a
            //     figure ABOVE the cap could not have come from counting
            //     edges. Were a future edit to swap the source to a
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

            // Zero /graphql HTTP hits during everything above — the
            // catalog, both entity pages, all four definitions pages,
            // both standards pages, the lobby, and both journeys pages
            // executed in-process too.
            expect(server.logs()).not.toContain(GRAPHQL_HIT_MARKER);

            // Teeth: a direct POST does reach the endpoint and the counter
            // records it — the zero-assertion above is not vacuous.
            const graphqlResponse = await fetch(`${server.base}/graphql`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: "{ __typename }" }),
            });
            expect(graphqlResponse.status).toBe(200);
            const graphqlBody = (await graphqlResponse.json()) as {
              data?: { __typename?: string };
            };
            expect(graphqlBody.data?.__typename).toBe("Query");
            await waitForLog(server, `${GRAPHQL_HIT_MARKER} #1`);
            // `logs()` grows from async pipe chunks, so a stray `#2` (a page
            // load counted after the POST) could still sit undelivered when
            // `#1` lands — give trailing chunks a beat to flush before the
            // zero-#2 assertion.
            await new Promise((resolve) => setTimeout(resolve, 50));
            // …and it is the ONLY hit: had the page load reached /graphql
            // over HTTP (with its log line lagging past the assertion
            // above), this POST would have been counted as #2.
            expect(server.logs()).not.toContain(`${GRAPHQL_HIT_MARKER} #2`);
          }
        } finally {
          await server.stop();
        }
      },
      TEST_TIMEOUT_MS,
    );
  }
});
