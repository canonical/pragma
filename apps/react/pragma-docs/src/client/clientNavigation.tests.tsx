/**
 * Client-side NAVIGATION over a hydrated app — the test class every suite
 * missed. Hydration tests mount one URL; the e2e never clicks. This file
 * drives the real user journey end to end: hydrate the catalog, click
 * through to an entity page, come back, then go back again through
 * history.
 *
 * What this file actually pins — an INTEGRATION contract, not a single
 * bug. Across every transition (link click forward, rail link back,
 * `history.back()`) it asserts: the destination DOM is correct, React
 * reported ZERO recoverable errors, and the network was NEVER touched.
 * That covers the seeded store surviving navigation, the prefetch guards
 * holding, and the rail's links resolving through the real router codecs.
 *
 * What it does NOT pin, despite its origin. This file was written for the
 * Outlet hook-attribution bug (a route wired `content: PageComponent` ran
 * the page's hooks in OUTLET's hook list, throwing "Rendered fewer hooks
 * than expected" on the first navigation between pages of differing hook
 * counts). Since AV-340 / PR #880 the router renders routes as real
 * fibers, and BOTH wiring styles are now safe — rewiring a route back to
 * the old crashing form leaves this file GREEN. The hook-ownership
 * regression is therefore pinned where it can still fail, upstream:
 * `packages/react/router/src/lib/Outlet/Outlet.test.tsx`, "Outlet hook
 * ownership (AV-340)". Do not read this file as that guard.
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
import { createEnvironment } from "#relay/environment.js";
import { setPrefetchEnvironment } from "#relay/prefetchEnvironment.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import type { InitialData } from "../server/entry.js";
import { hydrateApp } from "./hydrateApp.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const CATALOG_URL = "/components";
const ENTITY_LINK_SELECTOR =
  'a[href="/components/ds%3Aglobal.component.button"]';
const ENTITY_TITLE_SELECTOR = "#component-entity-title";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * Both pages' records in one store so the whole journey renders warm —
 * a shallow per-record merge is exact for Relay's flat record maps (the
 * only shared record is `client:root`, whose fields union cleanly).
 */
const mergeRecordMaps = (...maps: readonly RecordMap[]): RecordMap => {
  const merged: Record<string, Record<string, unknown>> = {};
  for (const map of maps) {
    for (const [dataId, record] of Object.entries(map)) {
      merged[dataId] = merged[dataId]
        ? { ...merged[dataId], ...(record as Record<string, unknown>) }
        : { ...(record as Record<string, unknown>) };
    }
  }
  return merged as unknown as RecordMap;
};

const journeyRecords = mergeRecordMaps(
  catalogRecords,
  componentEntityRecordsButton,
);

const renderSeededServerHtml = (
  fetchFn: FetchFunction,
  url: string,
  records: RecordMap,
): string =>
  renderToString(
    <HeadProvider>
      <RelayEnvironmentProvider
        environment={createEnvironment({ records, fetchFn })}
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

describe("client-side navigation over a hydrated app", () => {
  const roots: Root[] = [];
  const containers: HTMLElement[] = [];
  let globalFetch: ReturnType<typeof createFetchSpy>;

  beforeEach(() => {
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
    setPrefetchEnvironment(undefined);
    vi.unstubAllGlobals();
  });

  it("navigates catalog → entity → catalog → back without hook errors or fetches", async () => {
    const serverHtml = renderSeededServerHtml(
      createFetchSpy(),
      CATALOG_URL,
      journeyRecords,
    );
    expect(serverHtml).toContain(ENTITY_LINK_SELECTOR.slice(3, -2));

    window.history.pushState({}, "", CATALOG_URL);
    (window as TestWindow).__INITIAL_DATA__ = {
      url: CATALOG_URL,
      relay: { records: journeyRecords },
    };

    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    containers.push(container);
    const onRecoverableError = vi.fn();
    await act(async () => {
      roots.push(hydrateApp(container, { onRecoverableError }));
    });
    expect(onRecoverableError).not.toHaveBeenCalled();

    // Forward: click through to the entity page. The click drives the real
    // router (pushState → performLoad → store publish → Outlet re-render);
    // the settle beat lets the async load commit inside act.
    const entityLink =
      container.querySelector<HTMLAnchorElement>(ENTITY_LINK_SELECTOR);
    expect(entityLink).toBeTruthy();
    await act(async () => {
      entityLink?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const entityTitle = container.querySelector(ENTITY_TITLE_SELECTOR);
    expect(entityTitle?.textContent).toBe("Button");
    expect(window.location.pathname).toBe(
      "/components/ds%3Aglobal.component.button",
    );

    // Back: the rail's Components lens entry returns to the catalog —
    // the reverse hook-count transition, which must be just as silent.
    const catalogLink = container.querySelector<HTMLAnchorElement>(
      `nav[aria-label="Primary"] a[href="${CATALOG_URL}"]`,
    );
    expect(catalogLink).toBeTruthy();
    await act(async () => {
      catalogLink?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(container.querySelector("#lens-components-title")).toBeTruthy();
    expect(container.querySelector(ENTITY_LINK_SELECTOR)).toBeTruthy();

    // History: the browser's Back button, a structurally DIFFERENT path
    // through the router (its popstate handler, not its click handler) —
    // untested anywhere before. This jsdom fires popstate off `back()` on
    // its own; the explicit dispatch is belt-and-braces against a jsdom
    // that does not, and is harmless when it does (the router re-resolves
    // the same URL). The pathname assertions on either side are what give
    // the leg teeth: deleting the navigation fails on the first one, so it
    // cannot pass vacuously by sitting still.
    expect(window.location.pathname).toBe(CATALOG_URL);
    await act(async () => {
      window.history.back();
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(window.location.pathname).toBe(
      "/components/ds%3Aglobal.component.button",
    );
    // …and the destination re-rendered its own page, not a stale canvas.
    expect(container.querySelector(ENTITY_TITLE_SELECTOR)?.textContent).toBe(
      "Button",
    );

    // The whole round trip served from the seeded store: zero network, and
    // React reported no recoverable error at any transition.
    expect(globalFetch).not.toHaveBeenCalled();
    expect(onRecoverableError).not.toHaveBeenCalled();
  });
});
