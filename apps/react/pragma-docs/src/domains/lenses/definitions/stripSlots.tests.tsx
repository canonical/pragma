/**
 * The strip's tenants against the REAL frame: mounted the way the Shell
 * mounts them (from the route's `meta`), over the same warm store the
 * explorer reads.
 *
 * The claims that matter here are the two that a component test cannot
 * make: the strip SERVER-RENDERS its content from the warm store (so there
 * is no empty-then-populated hydration mismatch in the frame), and a cold
 * store degrades to empty sockets WITHOUT taking the frame down.
 */

import "./__fixtures__/stubReactFlowGlobals.js";
import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../../../routes.js";
import definitionsExplorerRecords from "./__fixtures__/definitionsExplorerRecords.js";
import { LensFilterProvider } from "./lensFilterContext.js";
import { definitionsStripSlots } from "./stripSlots.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** The strip's tenants under the provider stack the Shell gives them. */
const stripAt = (
  url: string,
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement => {
  const { Controls, Status } = definitionsStripSlots;
  return (
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
          <LensFilterProvider>
            <Controls />
            <Status />
          </LensFilterProvider>
        </RouterProvider>
      </RelayEnvironmentProvider>
    </HeadProvider>
  );
};

describe("the strip's tenants over a warm store", () => {
  it("SERVER-RENDERS both sockets from the warm store", () => {
    // The whole reason the strip reads Relay directly instead of being
    // told by the explorer: an announcement could only arrive in an
    // effect, so the server would render empty and the client populated —
    // a hydration mismatch in the frame itself.
    const fetchFn = createFetchSpy();
    const html = renderToString(
      stripAt("/definitions", definitionsExplorerRecords, fetchFn),
    );

    expect(html).toContain('data-slot="explorer-controls"');
    expect(html).toContain('data-slot="explorer-status"');
    // The live ontologies become chips, in the server markup.
    expect(html).toContain(">ds<");
    expect(html).toContain(">cs<");
    // And the figure carries the real live counts. React separates
    // adjacent text nodes with `<!-- -->` markers in SSR output, so the
    // caption is asserted on its stripped text rather than as one string.
    const caption = /<figcaption>([\s\S]*?)<\/figcaption>/
      .exec(html)?.[1]
      ?.replaceAll("<!-- -->", "");
    // 60 live classes across the four ontologies, 5 of them abstract.
    expect(caption).toBe("60 of 60 classes · 5 abstract");
    // Warm store: no network, on the server least of all.
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("counts the classes the graph actually shows, and recounts as chips move", () => {
    render(
      stripAt("/definitions", definitionsExplorerRecords, createFetchSpy()),
    );

    // Unfiltered: everything is shown, so visible === total.
    expect(screen.getByRole("figure").textContent).toContain("60 of 60");

    // Turn the anatomy ontology off; the count must drop by exactly that
    // ontology's 9 classes.
    fireEvent.click(screen.getByRole("button", { name: "anatomy" }));
    expect(screen.getByRole("figure").textContent).toContain("51 of 60");

    // The denominator — how many classes EXIST — never moves.
    expect(screen.getByRole("figure").textContent).toContain("of 60");
  });

  it("offers exactly the ontologies the graph carries, no invented ones", () => {
    render(
      stripAt("/definitions", definitionsExplorerRecords, createFetchSpy()),
    );
    expect(
      within(screen.getByRole("group", { name: "Filter by ontology" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["surface", "ds", "cs", "anatomy"]);
  });
});

describe("the strip's tenants over a COLD store", () => {
  it("degrade to empty sockets instead of suspending the whole frame", () => {
    // `useLazyLoadQuery` suspends on a cold store, and these render inside
    // the Shell — outside any page boundary. Unguarded, that takes the
    // entire document down (entry.tests.tsx caught exactly this). Each
    // socket therefore carries its own Suspense + error boundary.
    const fetchFn = createFetchSpy();
    const html = renderToString(stripAt("/definitions", undefined, fetchFn));

    // Rendered without throwing, and carrying no content.
    expect(html).not.toContain('data-slot="explorer-controls"');
    expect(html).not.toContain('data-slot="explorer-status"');
  });
});
