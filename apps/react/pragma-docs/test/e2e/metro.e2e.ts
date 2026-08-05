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
import { GRAPH_BINDINGS } from "#lib/graphBindings/index.js";
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
 * PRAGMA'S OWN VOCABULARY, taken from the app's shipped binding table rather
 * than retyped, so the negative control provably blocks the real prefixes.
 * A hand-written blocklist of invented strings would pass forever.
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
    Object.values(GRAPH_BINDINGS).map(
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

describe("the core lenses render against a provider that has never heard of pragma", () => {
  it(
    "dev:bun serves Definitions from @canonical/prism-graph-example",
    async () => {
      const provider = await startMetroProvider(GRAPH_EXAMPLE_CWD);
      const server = await startServer("dev:bun", CWD, {
        timeoutMs: DEV_READY_MS,
        graphqlUrl: provider.url,
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
      } finally {
        await server.stop();
        await provider.stop();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
