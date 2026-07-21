/**
 * The client-hydration seam, exercised end to end (P-2 Stage 1): the seeded
 * SSR output hydrates through the REAL seeding logic — `hydrateApp` reading
 * `window.__INITIAL_DATA__` — with no React 19 recoverable error and no
 * network request, proving the render is served entirely from the seeded
 * store. React 19 reports hydration mismatches through `onRecoverableError`
 * (a `console.error` spy does NOT catch them — see `Chip.ssr.tests.tsx`), so
 * the spy rides the seam's `hydrateRoot` options; two deliberate-breakage
 * controls prove both spies can fail.
 */

import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import catalogRecords from "#domains/components/__fixtures__/catalogRecords.js";
import componentEntityRecordsButton from "#domains/components/__fixtures__/componentEntityRecordsButton.js";
// Definitions block: the captured explorer records, plus the jsdom shims
// React Flow needs when the well MOUNTS (ResizeObserver/DOMMatrix —
// side-effect import, no test behaviour of its own).
import definitionsExplorerRecords from "#domains/lenses/definitions/__fixtures__/definitionsExplorerRecords.js";
import "#domains/lenses/definitions/__fixtures__/stubReactFlowGlobals.js";
import journeysExplorerRecordsJob from "#domains/lenses/journeys/__fixtures__/journeysExplorerRecordsJob.js";
import standardEntityRecords from "#domains/lenses/standards/__fixtures__/standardEntityRecords.js";
import lobbyRecords from "#domains/marketing/__fixtures__/lobbyRecords.js";
import componentProbeRecords from "#domains/playground/__fixtures__/componentProbeRecords.js";
import { createEnvironment } from "#relay/environment.js";
import { setPrefetchEnvironment } from "#relay/prefetchEnvironment.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import type { InitialData } from "../server/entry.js";
import { hydrateApp } from "./hydrateApp.js";

// Driving `act` directly (no Testing Library wrapper) needs the flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** The URL the server renders and the client hydrates at. */
const PLAYGROUND_URL = "/playground";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * The seeded pages the seam must hydrate silently. The P-5 lens routes
 * carry `prefetch` hooks that FIRE during these tests (the browser
 * router's initial `performLoad`), so the zero-fetch assertion also proves
 * `warmRouteQuery`'s check guard: without it, the initial pass would
 * refetch the very page the server just seeded.
 */
const SEEDED_PAGES = [
  {
    name: "playground probe",
    url: PLAYGROUND_URL,
    records: componentProbeRecords,
    serverMarker: "<h2>Button</h2>",
    liveSelector: "h2",
    liveText: "Button",
  },
  {
    name: "component entity",
    url: "/components/ds%3Aglobal.component.button",
    records: componentEntityRecordsButton,
    serverMarker: '<h1 id="component-entity-title">Button</h1>',
    liveSelector: "#component-entity-title",
    liveText: "Button",
  },
  {
    name: "components catalog",
    url: "/components",
    records: catalogRecords,
    serverMarker: 'href="/components/ds%3Aglobal.component.accordion"',
    liveSelector: 'a[href="/components/ds%3Aglobal.component.button"]',
    liveText: "Button",
  },
  // Definitions block (P-5): THE React Flow SSR gate — the term page's
  // server HTML carries the well's full node DOM, and hydrating over it
  // must stay mismatch-silent and network-silent like every other
  // seeded page.
  {
    name: "definitions term",
    url: "/definitions/ds%3AUIBlock",
    records: definitionsExplorerRecords,
    serverMarker: '<h2 id="term-inspector-title">UI Block</h2>',
    liveSelector: "#term-inspector-title",
    liveText: "UI Block",
  },
  // Standards block (P-5): the reading page — the server HTML carries
  // the article's identity h1 (URI-as-title: this live standard has no
  // display name) and hydrating over it must stay mismatch-silent and
  // network-silent like every other seeded page.
  {
    name: "standard reading",
    url: "/standards/cs%3Areact.component.link_component",
    records: standardEntityRecords,
    serverMarker:
      '<h1 id="standard-reading-title">cs:react.component.link_component</h1>',
    liveSelector: "#standard-reading-title",
    liveText: "cs:react.component.link_component",
  },
  // Journeys block (AV-351): THE SECOND React Flow SSR gate — the job
  // page's server HTML carries the journey well's full node DOM (38
  // nodes, 40 edges against the live model), and hydrating over it must
  // stay mismatch-silent and network-silent like every other seeded page.
  // The well holds NO client-only state at all, so this is the strongest
  // form of the claim: the first client render reproduces the server's
  // markup by construction.
  {
    name: "journeys job",
    url: "/journeys/sem%3A%2F%2Fdesign-system-docs%23job.l3",
    records: journeysExplorerRecordsJob,
    serverMarker: '<h2 id="journey-inspector-title">job.l3</h2>',
    liveSelector: "#journey-inspector-title",
    liveText: "job.l3",
  },
  // Home block (AV-350): the lobby — the front door's two projections
  // SSR from the captured store and must survive hydration
  // mismatch-silent and network-silent like every other seeded page. The
  // live assertion reads an exemplar link (the strip projection); the
  // door counts ride the same store and the same render.
  {
    name: "home lobby",
    url: "/",
    records: lobbyRecords,
    serverMarker: 'href="/components/ds%3Aglobal.component.accordion"',
    liveSelector: 'a[href="/components/ds%3Aglobal.component.accordion"]',
    liveText: "Accordion",
  },
] as const;

/**
 * Server HTML of the app tree at `url` from a store seeded with `records`
 * — the same composition `EntryServer` renders inside `#root` (static
 * router in, browser router out), so the seam hydrates the bytes a dev
 * server would actually serve.
 */
const renderSeededServerHtml = (
  fetchFn: FetchFunction,
  url: string = PLAYGROUND_URL,
  records: RecordMap = componentProbeRecords,
): string =>
  renderToString(
    <HeadProvider>
      <RelayEnvironmentProvider
        environment={createEnvironment({
          records,
          fetchFn,
        })}
      >
        <RouterProvider
          router={createStaticRouter(appRoutes, url, {
            middleware: [...middleware],
            notFound: notFoundRoute,
          })}
        >
          <Outlet fallback={<p>Loading…</p>} />
        </RouterProvider>
      </RelayEnvironmentProvider>
    </HeadProvider>,
  );

type TestWindow = Window & { __INITIAL_DATA__?: InitialData };

describe("hydrateApp over the seeded SSR output", () => {
  const roots: Root[] = [];
  const containers: HTMLElement[] = [];
  /**
   * Observes the seam's production network path: `createEnvironment` without
   * `fetchFn` posts over HTTP, and `relay-runtime-network`'s executor
   * resolves `globalThis.fetch` per request — so this never-settling stub
   * sees exactly the requests a hydrated browser would make.
   */
  let globalFetch: ReturnType<typeof createFetchSpy>;

  beforeEach(() => {
    // jsdom 28 implements no `window.matchMedia`, which the app tree's
    // ThemeSelector reads during render (usePreferredTheme). An inert
    // always-false stub keeps the server render and the hydration render
    // deterministic and identical.
    vi.stubGlobal(
      "matchMedia",
      (query: string): MediaQueryList =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );
    globalFetch = createFetchSpy();
    vi.stubGlobal("fetch", globalFetch);
  });

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      await act(async () => {
        root.unmount();
      });
    }
    for (const container of containers.splice(0)) {
      container.remove();
    }
    delete (window as TestWindow).__INITIAL_DATA__;
    window.history.pushState({}, "", "/");
    // `hydrateApp` publishes its environment in the MODULE-scope prefetch
    // holder, which this file's tests would otherwise share: the next
    // test's `renderSeededServerHtml` builds a static router whose initial
    // load fires route prefetch hooks, and a stale environment there would
    // fetch against the WRONG store. Production has no such leak (the
    // server registries never call the setter); clearing restores exactly
    // that posture per test.
    setPrefetchEnvironment(undefined);
    vi.unstubAllGlobals();
  });

  /** Hydrates via the seam over `serverHtml`; returns the mismatch spy. */
  async function hydrateInto(serverHtml: string) {
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    containers.push(container);
    const onRecoverableError = vi.fn();
    await act(async () => {
      roots.push(hydrateApp(container, { onRecoverableError }));
    });
    return { container, onRecoverableError };
  }

  it.each(
    SEEDED_PAGES,
  )("hydrates the $name from the seeded store: no recoverable error, no fetch", async ({
    url,
    records,
    serverMarker,
    liveSelector,
    liveText,
  }) => {
    const serverFetchFn = createFetchSpy();
    const serverHtml = renderSeededServerHtml(serverFetchFn, url, records);
    // The server render itself came from the warm store, not the network.
    expect(serverHtml).toContain(serverMarker);
    expect(serverFetchFn).not.toHaveBeenCalled();

    // The browser router reads the location the seam hydrates at.
    window.history.pushState({}, "", url);
    (window as TestWindow).__INITIAL_DATA__ = {
      url,
      relay: { records },
    };
    const { container, onRecoverableError } = await hydrateInto(serverHtml);

    // React 19's hydration-mismatch channel stayed silent…
    expect(onRecoverableError).not.toHaveBeenCalled();
    // …the page's content is live in the hydrated tree…
    expect(container.querySelector(liveSelector)?.textContent).toBe(liveText);
    // …and the network was NEVER consulted: hydration read the records
    // the seam seeded from `__INITIAL_DATA__`, and the route prefetch the
    // initial load fires found the store already warm (`warmRouteQuery`'s
    // check guard). Discarding the records in `hydrateApp`
    // (`records: undefined`) or the guard in `warmRouteQuery` turns
    // exactly this assertion red.
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("control: discarding the seeded records makes hydration fetch", async () => {
    window.history.pushState({}, "", PLAYGROUND_URL);
    const serverHtml = renderSeededServerHtml(createFetchSpy());
    // No `__INITIAL_DATA__` on `window`: the seam finds no records, the
    // store starts cold, and the probe's query goes over HTTP — the exact
    // silent regression the green test's zero-fetch assertion guards.
    const { onRecoverableError } = await hydrateInto(serverHtml);
    expect(globalFetch).toHaveBeenCalledTimes(1);
    // A cold store suspends the probe; suspension is not a mismatch.
    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it("control: hydrating over tampered server HTML reports a recoverable error", async () => {
    window.history.pushState({}, "", PLAYGROUND_URL);
    const serverHtml = renderSeededServerHtml(createFetchSpy());
    const tampered = serverHtml.replace("<h2>Button</h2>", "<h2>Impostor</h2>");
    expect(tampered).not.toBe(serverHtml);
    (window as TestWindow).__INITIAL_DATA__ = {
      url: PLAYGROUND_URL,
      relay: { records: componentProbeRecords },
    };
    // React also prints the mismatch diff via console.error; silence it so
    // the deliberate failure does not pollute the run's output.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { onRecoverableError } = await hydrateInto(tampered);
      expect(onRecoverableError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
