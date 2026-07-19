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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import componentProbeRecords from "#domains/playground/__fixtures__/componentProbeRecords.js";
import { createEnvironment } from "#relay/environment.js";
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
 * Server HTML of the app tree at `/playground` from a store seeded with the
 * captured fixture — the same composition `EntryServer` renders inside
 * `#root` (static router in, browser router out), so the seam hydrates the
 * bytes a dev server would actually serve.
 */
const renderSeededServerHtml = (fetchFn: FetchFunction): string =>
  renderToString(
    <HeadProvider>
      <RelayEnvironmentProvider
        environment={createEnvironment({
          records: componentProbeRecords,
          fetchFn,
        })}
      >
        <RouterProvider
          router={createStaticRouter(appRoutes, PLAYGROUND_URL, {
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
    // The browser router reads the location the seam hydrates at.
    window.history.pushState({}, "", PLAYGROUND_URL);
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

  it("hydrates from the seeded store: no recoverable error, no fetch", async () => {
    const serverFetchFn = createFetchSpy();
    const serverHtml = renderSeededServerHtml(serverFetchFn);
    // The server render itself came from the warm store, not the network.
    expect(serverHtml).toContain("<h2>Button</h2>");
    expect(serverFetchFn).not.toHaveBeenCalled();

    (window as TestWindow).__INITIAL_DATA__ = {
      url: PLAYGROUND_URL,
      relay: { records: componentProbeRecords },
    };
    const { container, onRecoverableError } = await hydrateInto(serverHtml);

    // React 19's hydration-mismatch channel stayed silent…
    expect(onRecoverableError).not.toHaveBeenCalled();
    // …the probe's content is live in the hydrated tree…
    expect(container.querySelector("h2")?.textContent).toBe("Button");
    // …and the network was NEVER consulted: hydration read the records the
    // seam seeded from `__INITIAL_DATA__`. Discarding them in `hydrateApp`
    // (`records: undefined`) turns exactly this assertion red.
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("control: discarding the seeded records makes hydration fetch", async () => {
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
