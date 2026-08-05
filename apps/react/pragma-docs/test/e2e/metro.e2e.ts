// @vitest-environment node

/**
 * THE DESPECIALISATION PROOF: the core lenses render against a provider that
 * has never heard of pragma.
 *
 * The app is booted — its real `dev:bun` script, its real prepare step, its
 * real renderer — against `@canonical/prism-graph-example`, a hand-written
 * GraphQL provider over a fictional metro network whose only relationship to
 * this repo is `@canonical/prism-contract`. Nothing in it knows what a
 * component, a code standard, a job or a persona is.
 *
 * WHAT IS PROVEN, EXACTLY. Two lenses, four routes — Definitions
 * (`/definitions`, `/definitions/:term`) and Standards (`/standards`,
 * `/standards/:iri`) — plus the frame and the sitemap. NOT "the docsite" and
 * NOT "the four lenses": Components is pragma-specific by owner decision, and
 * Home's `LobbyQuery` carries `... on Component`, which the metro endpoint
 * rejects with `Unknown type "Component".` Home is therefore asserted for its
 * FRAME only, and nothing here claims otherwise.
 *
 * WITHOUT THIS FILE the neutrality claim rests on the acceptance gate in
 * `packages/docsite/graph-example`, which executes the app's four operation
 * texts against the example provider but never renders anything. A query can
 * be neutral while the components reading it are not — a `uri.startsWith`,
 * a hard-coded prefix, a lens that assumes pragma's shape. This is the only
 * check in the repo that runs the real app end to end against a foreign
 * graph.
 *
 * ── THE CROSS-REGISTRY PAIR: why every route asserts TWO things ──
 *
 * `#lib/graphBindings` is instantiated in three independent module
 * registries in this cell: Bun native (`server.bun.ts` → `prepareRelayData`),
 * Vite SSR (`ssrLoadModule("/src/server/entry.tsx")`), and the Vite client
 * bundle. Prepare runs in the first, render in the second. If they resolve
 * different bindings the prepare step warms the store with records the
 * renderer's operation does not match, and `entry.tsx`'s `fetchFn` rejects
 * by design — so the page renders its SUSPENSE FALLBACK, not an error.
 *
 * Records-present-plus-content-absent is exactly that divergence. So each
 * data-bearing route asserts BOTH that `__INITIAL_DATA__.relay.records`
 * carries metro data AND that the rendered HTML carries it. Content present
 * proves both registries agreed; nothing can paper over a miss by refetching.
 *
 * Kept out of the default `test` run by the `*.e2e.ts` name. Run it with
 * `bun run test:proof`.
 */
import { describe, expect, it } from "vitest";
import {
  DEPLOYMENT_ENV_VAR,
  DEPLOYMENTS,
} from "#lib/graphBindings/deployments.js";
import { startMetroProvider, startServer } from "./serverHarness.js";

const CWD = process.cwd();

/** Where the example provider's demo server lives, relative to this app. */
const GRAPH_EXAMPLE_CWD = new URL(
  "../../../../../packages/docsite/graph-example",
  import.meta.url,
).pathname;

/**
 * Readiness budget. A cold Vite dep-optimisation dominates the boot (~20 s
 * measured, logging "Re-optimizing dependencies"); no graph is compiled,
 * because the launcher spawns none when `VITE_GRAPHQL_URL` is set. If this
 * cell ever fails with "server did not respond on <port> within Nms", raise
 * the budget before suspecting anything else.
 */
const DEV_READY_MS = 90_000;

/** Readiness plus a dozen server-rendered pages, each executing a query. */
const TEST_TIMEOUT_MS = DEV_READY_MS + 90_000;

/**
 * PRAGMA'S OWN VOCABULARY, taken from the pragma deployment table rather than
 * retyped, so the negative control provably blocks the real prefixes. A
 * hand-written blocklist of invented strings would pass forever.
 *
 * This is the one place the proof imports an app module — `servers.e2e.ts`
 * keeps the server a black box, and that rule is worth bending exactly here:
 * the assertion IS "the strings this app binds to are absent", so it has to
 * read them from where they are bound.
 *
 * The colon is load-bearing. A bare `ds` matches `class="ds standards-page"`
 * and `class="ds lobby"`, which are stylesheet names, not graph data.
 */
const PRAGMA_PREFIXES = [
  ...new Set(
    Object.values(DEPLOYMENTS.pragma).map(
      (binding) => `${binding.classUri.split(":")[0]}:`,
    ),
  ),
];

/**
 * Everything a metro response must never contain.
 *
 * The first entries are pragma's class prefixes (above). `sem://` is the
 * journeys addon's scheme and `pragma.canonical.com` the code-standards
 * namespace — neither is bound through the table, so both are named here.
 *
 * `href="/components/` is the sharpest one: the term inspector's D31 landing
 * rule links an instance to `/components/:uri` when its class IS the
 * components binding, and the metro deployment binds `components` to a class
 * with no instances precisely so the rule can never fire. A single such href
 * would mean the app had linked a reader into a lens metro cannot serve.
 */
const FOREIGN_MARKERS = [
  ...PRAGMA_PREFIXES,
  "sem://",
  "pragma.canonical.com",
  'href="/components/',
];

/** The frame every page must paint, whatever provider fills the canvas. */
function expectPortableFrame(html: string): void {
  expect(html).toContain('data-region="primary-nav"');
  expect(html).toContain('data-region="canvas"');
}

/** No pragma vocabulary may reach a page served from the metro graph. */
function expectNoPragmaVocabulary(label: string, html: string): void {
  for (const marker of FOREIGN_MARKERS) {
    expect(html.includes(marker), `${label} must not contain ${marker}`).toBe(
      false,
    );
  }
}

/**
 * The serialised Relay store the prepare step embedded for hydration.
 *
 * PARSED, not string-matched: `expect(html).toContain('"records"')` passes on
 * an empty record map, and an empty map is exactly what a prepare step that
 * silently fetched nothing produces.
 */
function initialRelayRecords(html: string): Record<string, unknown> {
  const script = /__INITIAL_DATA__ = ([\s\S]*?);?<\/script>/.exec(html)?.[1];
  expect(script, "the page must embed __INITIAL_DATA__").toBeTruthy();
  const parsed = JSON.parse(script as string) as {
    relay?: { records?: Record<string, unknown> };
  };
  const records = parsed.relay?.records;
  expect(records, "__INITIAL_DATA__ must carry relay.records").toBeTruthy();
  return records as Record<string, unknown>;
}

/** Does the warmed store hold anything from the metro graph at all? */
function storeMentionsMetro(records: Record<string, unknown>): boolean {
  return JSON.stringify(records).includes("metro:");
}

/** Poll until the provider's hit counter shows `count` of `source`. */
async function waitForHits(
  provider: { hits: (source: "ssr" | "client") => number },
  source: "client" | "ssr",
  count: number,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (provider.hits(source) < count) {
    if (Date.now() > deadline) {
      throw new Error(
        `only ${provider.hits(source)} ${source} hits seen within ${timeoutMs}ms (wanted ${count})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * THE SERVED FRAME: the shell chrome around one page's canvas.
 *
 * Cut precisely, in two pieces, never by regex over the whole document:
 * everything from `<body` up to and including the `<main data-region="canvas">`
 * OPEN TAG, plus everything from `</main>` up to the first `<script` after it.
 *
 * The trailing cut is what `frameStability.tests.tsx` does not need. It renders
 * in-process, so it never sees the hydration payload; a served page carries
 * `__INITIAL_DATA__` and the module scripts inside `<body>` after the shell,
 * and those are per-page DATA by construction. Cutting at the first script
 * after the canvas removes them without a normalisation rule that could hide a
 * real difference — the footer between `</main>` and that script stays in.
 */
function frameOf(html: string): string {
  const bodyStart = html.indexOf("<body");
  const bodyEnd = html.lastIndexOf("</body>");
  expect(bodyStart).toBeGreaterThan(-1);
  expect(bodyEnd).toBeGreaterThan(bodyStart);
  const body = html.slice(bodyStart, bodyEnd);
  // The canvas's structural identity must be unique for the cut to be exact.
  expect(body.split("<main").length - 1).toBe(1);
  expect(body.split("</main>").length - 1).toBe(1);
  const open = body.indexOf("<main");
  const openEnd = body.indexOf(">", open);
  expect(body.slice(open, openEnd)).toContain('data-region="canvas"');
  const tail = body.slice(body.lastIndexOf("</main>"));
  const firstScript = tail.indexOf("<script");
  expect(firstScript).toBeGreaterThan(-1);
  return body.slice(0, openEnd + 1) + tail.slice(0, firstScript);
}

/** The strip's three claimed slots — the only frame content a lens owns. */
const STRIP_CONTEXT_PATTERN =
  /(<div class="strip-context" data-slot="context">)([\s\S]*?)(<\/div><div class="strip-controls")/;
const STRIP_CONTROLS_PATTERN =
  /(<div class="strip-controls" data-slot="controls">)([\s\S]*?)(<\/div><div class="strip-status")/;
const STRIP_STATUS_PATTERN =
  /(<div class="strip-status" data-slot="status">)([\s\S]*?)(<\/div><\/header>)/;

/**
 * Forgive exactly the accounted-for deltas, nothing else — the same three
 * strip slots and the same router attribute `frameStability.tests.tsx`
 * forgives, so this measures its property rather than a weaker one.
 */
function normalizeFrame(frame: string): string {
  return frame
    .replaceAll(' aria-current="page"', "")
    .replace(STRIP_CONTEXT_PATTERN, "$1$3")
    .replace(STRIP_CONTROLS_PATTERN, "$1$3")
    .replace(STRIP_STATUS_PATTERN, "$1$3");
}

describe("the core lenses render against a provider that has never heard of pragma", () => {
  it(
    "dev:bun serves Definitions and Standards from @canonical/prism-graph-example",
    async () => {
      const provider = await startMetroProvider(GRAPH_EXAMPLE_CWD);
      const server = await startServer("dev:bun", CWD, {
        timeoutMs: DEV_READY_MS,
        graphqlUrl: provider.url,
        // The Standards lens roots at a class named from OUTSIDE the graph,
        // so it is the one lens that needs the deployment said out loud.
        // Definitions takes its variables from the URL and would render
        // against metro with this unset.
        env: { [DEPLOYMENT_ENV_VAR]: "metro" },
      });
      try {
        // 1. THE PRECONDITION, stated as an assertion rather than a skip: the
        //    provider is serving the contract. Every literal below is a claim
        //    about metro data, so without the provider they all fail for the
        //    same uninformative reason.
        const providerUp = await fetch(provider.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-pragma-ssr": "1",
          },
          body: JSON.stringify({ query: "{ __typename }" }),
        });
        expect(providerUp.status).toBe(200);
        expect(providerUp.headers.get("content-type")).toMatch(
          /application\/json/,
        );

        // 2. HOME: the frame only. `LobbyQuery` carries `... on Component`,
        //    which this provider rejects — so the lobby's canvas suspends and
        //    NOTHING about home's data may be asserted here. What IS proven is
        //    the portable skeleton: the shell, the nav and the canvas plate
        //    render from authored code, independent of any graph.
        const home = await fetch(`${server.base}/`);
        expect(home.status).toBe(200);
        const homeHtml = await home.text();
        expect(homeHtml).toContain('id="root"');
        expectPortableFrame(homeHtml);
        expectNoPragmaVocabulary("/", homeHtml);

        // 3. /sitemap.xml: the second renderer, picked by path, involves no
        //    graph at all — so it must be unaffected by which provider is
        //    behind the app. A regression here would mean the metro boot broke
        //    routing itself rather than data.
        const sitemap = await fetch(`${server.base}/sitemap.xml`);
        expect(sitemap.status).toBe(200);
        expect(sitemap.headers.get("content-type")).toMatch(/xml/);
        const xml = await sitemap.text();
        expect(xml).toContain("<urlset");
        expect(xml).toContain("<loc>");

        // 4. /definitions — the term-LESS explorer. Its variables come from
        //    the URL, not from the binding table, which is why this lens needs
        //    no configuration to point at metro at all.
        const definitions = await fetch(`${server.base}/definitions`);
        expect(definitions.status).toBe(200);
        const definitionsHtml = await definitions.text();
        expectPortableFrame(definitionsHtml);
        expect(definitionsHtml).toContain('data-slot="explorer-rail"');
        //    The honest empty inspector: no default term, no redirect.
        expect(definitionsHtml).toContain("Select a term");
        //    …and nothing is selected, so nothing fades. Same graph as the
        //    term page below, no privileged centre.
        expect(definitionsHtml).not.toContain("is-faded");
        expect(definitionsHtml).not.toContain("is-selected");
        //    The cross-registry pair: metro records in the store AND metro
        //    data in the HTML the reader receives.
        expect(storeMentionsMetro(initialRelayRecords(definitionsHtml))).toBe(
          true,
        );
        expect(definitionsHtml).toContain("metro:");
        expectNoPragmaVocabulary("/definitions", definitionsHtml);

        // 5. /definitions/metro%3AStation — the full triptych over a foreign
        //    ontology: rail, hierarchy well, term inspector.
        const term = await fetch(`${server.base}/definitions/metro%3AStation`);
        expect(term.status).toBe(200);
        const termHtml = await term.text();
        expectPortableFrame(termHtml);
        expect(storeMentionsMetro(initialRelayRecords(termHtml))).toBe(true);

        //    The well draws exactly one node per class the rail lists, so the
        //    two counts must agree — both derived from THIS response, never
        //    pinned, so the assertion survives the dataset growing and breaks
        //    only when the well renders partially. The floor closes the case
        //    a bare equality waves through (0 === 0).
        const nodeCount = (termHtml.match(/hierarchy-node-shell/g) ?? [])
          .length;
        const railClassLinkCount = (
          termHtml.match(/<h3>Classes[\s\S]*?<h3>Properties/g) ?? []
        )
          .map(
            (section) => (section.match(/href="\/definitions\//g) ?? []).length,
          )
          .reduce((sum, count) => sum + count, 0);
        expect(nodeCount).toBeGreaterThan(0);
        expect(nodeCount).toBe(railClassLinkCount);

        //    THE SELECTION'S EGO-FADE IS SERVER-RENDERED, because the term is
        //    in the URL. Some nodes fade and some do NOT: a fade that
        //    swallowed everything would convey nothing, so the spared one-hop
        //    neighbourhood is what proves the rule is a neighbourhood.
        const fadedCount = (
          termHtml.match(/hierarchy-node-shell[^"]*is-faded/g) ?? []
        ).length;
        expect(fadedCount).toBeGreaterThan(0);
        expect(fadedCount).toBeLessThan(nodeCount);
        expect(termHtml).toContain("is-selected");
        //    The rail dims, it never hides: server-side the filter is the
        //    no-op, so no rail item may carry the dim marker.
        expect(termHtml).not.toContain('data-dimmed="true"');

        //    THE STRIP IS CLAIMED AND USEFUL, over metro's ontologies: both
        //    sockets carry content and the status figure counts real classes.
        //    The figure agrees with the graph the well drew — both sides
        //    derived from this response — so it can never flatter the graph.
        expect(termHtml).toContain('data-slot="explorer-controls"');
        expect(termHtml).toContain('data-slot="explorer-status"');
        const abstractNodeCount = (termHtml.match(/hierarchy-node-tag/g) ?? [])
          .length;
        expect(abstractNodeCount).toBeGreaterThan(0);
        const statusCaption = /<figcaption>([\s\S]*?)<\/figcaption>/
          .exec(termHtml)?.[1]
          ?.replaceAll("<!-- -->", "");
        expect(statusCaption).toBe(
          `${nodeCount} of ${nodeCount} classes · ${abstractNodeCount} abstract`,
        );

        //    THE INSPECTOR reads metro's own vocabulary: the class's title,
        //    its compact identity, a property row the METRO dataset defines
        //    (`platform count` — `packages/docsite/graph-example/src/lib/
        //    provider/dataset.ts`), and its instance list. Nothing here has a
        //    pragma equivalent, which is the point.
        expect(termHtml).toContain('<h2 id="term-inspector-title">Station');
        expect(termHtml).toContain("metro:Station");
        expect(termHtml).toContain("platform count");
        expect(termHtml).toContain("<h3>Instances</h3>");
        expect(termHtml).toContain("metro:northgate");
        expectNoPragmaVocabulary("/definitions/metro:Station", termHtml);

        // 6. /standards — the lens that could NOT render against metro before
        //    the deployment table existed. Its root class comes from
        //    `GRAPH_BINDINGS`, so with the pragma table it asked for
        //    `cs:CodeStandard`, a class metro does not have, and rendered its
        //    honest "No standards in the graph." This block is the deployment
        //    seam's whole reason for existing.
        const standardsIndex = await fetch(`${server.base}/standards`);
        expect(standardsIndex.status).toBe(200);
        const standardsIndexHtml = await standardsIndex.text();
        expectPortableFrame(standardsIndexHtml);
        //    THE CROSS-REGISTRY PAIR. The prepare step runs in the Bun-native
        //    registry and the render in the Vite SSR one; if they resolved
        //    different deployments the store would fill while
        //    `useLazyLoadQuery` missed, and the page would serve
        //    `Loading the standards…` with a full record map underneath.
        //    Records AND content, therefore, or neither proves anything.
        expect(
          storeMentionsMetro(initialRelayRecords(standardsIndexHtml)),
        ).toBe(true);
        expect(standardsIndexHtml).not.toContain("No standards in the graph");

        //    Grouping is by the instance's own CLASS. `metro:Station` has 14
        //    direct instances and 2 `metro:Interchange` (a Station subclass),
        //    so there are exactly TWO groups — a dataset fact
        //    (`packages/docsite/graph-example/src/lib/provider/dataset.ts`),
        //    and the reason this class was bound rather than `metro:Stop`,
        //    which yields one group and never renders the jump-nav at all.
        const groupSections =
          standardsIndexHtml.match(/<section[^>]*id="standards-group-/g) ?? [];
        expect(groupSections).toHaveLength(2);
        expect(standardsIndexHtml).toContain('id="standards-group-station"');
        expect(standardsIndexHtml).toContain(
          'id="standards-group-interchange"',
        );
        //    The jump rail lists one anchor per group when there is more than
        //    one group — derived from THIS response, so the relation holds as
        //    the dataset grows.
        const groupJumpLinkCount = (
          standardsIndexHtml.match(/href="#standards-group-/g) ?? []
        ).length;
        expect(groupJumpLinkCount).toBe(groupSections.length);
        //    A group exists only because standards fill it, so links strictly
        //    exceed sections. Both counted from this response.
        const standardLinkCount = (
          standardsIndexHtml.match(/href="\/standards\/https%3A/g) ?? []
        ).length;
        expect(standardLinkCount).toBeGreaterThan(groupSections.length);

        //    THE COMPACT IDENTITY. The link text is `_meta.title` and the
        //    href the absolute IRI, so without this the reader could lose the
        //    curie form entirely while every href assertion still passed.
        expect(standardsIndexHtml).toContain("<code>metro:northgate</code>");
        //    The D31 href: the percent-encoded ABSOLUTE IRI, the only address
        //    `node(id:)` accepts — over a namespace pragma has never seen.
        expect(standardsIndexHtml).toContain(
          'href="/standards/https%3A%2F%2Fmetro.example%2Fonto%23northgate"',
        );
        //    Deliberately NO `Load more` assertion: 16 instances sit under the
        //    app's 100-item page size, so `hasNextPage` is false and the
        //    button correctly does not render. Asserting it would be asserting
        //    a pragma-scale fact about a metro-scale graph.
        expectNoPragmaVocabulary("/standards", standardsIndexHtml);

        // 7. /standards/<northgate> — the reading page over a foreign entity.
        const standardReading = await fetch(
          `${server.base}/standards/${encodeURIComponent(
            "https://metro.example/onto#northgate",
          )}`,
        );
        expect(standardReading.status).toBe(200);
        const standardReadingHtml = await standardReading.text();
        expectPortableFrame(standardReadingHtml);
        expect(
          storeMentionsMetro(initialRelayRecords(standardReadingHtml)),
        ).toBe(true);
        //    The other half of the cross-registry pair, and the sharpest one
        //    on this route: before the seam, the prepare step already warmed
        //    the store with `metro:northgate` and the page STILL said "No
        //    standard found" — because the `boundClass` guard compared
        //    against pragma's class. Records without content is exactly that
        //    failure, so it is named explicitly rather than left to a
        //    positive assertion to imply.
        expect(standardReadingHtml).not.toContain("No standard found");
        expect(standardReadingHtml).toContain('data-slot="reading-canvas"');
        expect(standardReadingHtml).toContain("Northgate");
        expect(standardReadingHtml).toContain("metro:northgate");
        //    The article's one piece of graph metadata outside the prose.
        //    React splits the text node, hence the comment marker.
        expect(standardReadingHtml).toContain("class: <!-- -->");
        //    The prose arrives through `_meta.definition` and SSRs verbatim.
        expect(standardReadingHtml).toContain("The northern terminus.");
        expectNoPragmaVocabulary("/standards/<northgate>", standardReadingHtml);

        // 8. WHO MADE THE REQUESTS. Every page above was fetched with plain
        //    `fetch` — no browser, no client JS — yet six data-bearing routes
        //    rendered real metro data. So the provider must have been hit
        //    MANY times by the SERVER and NEVER by a client. Without this the
        //    proof cannot distinguish "the server fetched and rendered" from
        //    "the HTML happened to contain the right strings".
        //
        //    Deliberately no exact N: the page count drifts with the routes.
        expect(provider.hits("ssr")).toBeGreaterThan(5);
        const clientHitsBefore = provider.hits("client");
        expect(clientHitsBefore).toBe(0);

        //    Teeth, as a STRICT DELTA: a direct POST with no `x-pragma-ssr`
        //    header is what a browser looks like, and it must move the client
        //    counter by exactly one. Without this the zero above could be
        //    vacuous — a counter that never counts anything reads as zero
        //    forever.
        const browserLikePost = await fetch(provider.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: "{ __typename }" }),
        });
        expect(browserLikePost.status).toBe(200);
        await browserLikePost.text();
        await waitForHits(provider, "client", clientHitsBefore + 1);
        //    Counters grow from async pipe chunks, so give trailing chunks a
        //    beat to flush before asserting nothing ELSE arrived.
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(provider.hits("client")).toBe(clientHitsBefore + 1);

        // 9. THE PORTABLE SKELETON, measured rather than asserted. Every
        //    route above got `expectPortableFrame`, which only proves the two
        //    regions exist. This is the stronger claim `frameStability.tests
        //    .tsx` makes in-process: the served frame is BYTE-IDENTICAL
        //    between two different lenses once the three slots a lens owns
        //    are blanked. That fixture-driven suite seeds itself from pragma
        //    records and never contacts a provider, so it cannot say this
        //    about a foreign graph. This can.
        const standardsFrame = frameOf(standardsIndexHtml);
        const definitionsFrame = frameOf(definitionsHtml);
        //    Teeth first: the RAW frames must DIFFER. Without this the
        //    equality below would also pass if the cut returned nothing, or
        //    if the normaliser wiped everything that varies AND everything
        //    that does not.
        expect(standardsFrame).not.toBe(definitionsFrame);
        expect(normalizeFrame(standardsFrame).length).toBeGreaterThan(1_000);
        expect(normalizeFrame(standardsFrame)).toBe(
          normalizeFrame(definitionsFrame),
        );
      } finally {
        await server.stop();
        await provider.stop();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
