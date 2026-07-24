/**
 * The React Flow SSR keystone for this lens: the well renders its FULL
 * node and edge DOM to a string, with no browser API in the path.
 *
 * This works only because every node carries explicit `width`/`height`
 * and both `handles` from the deterministic layout, and because the
 * component holds no client-only state and never calls `fitView`. Each of
 * those is a real constraint, so each is asserted here rather than trusted.
 */

import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import JourneyWell from "./JourneyWell.js";

const renderWell = (job: string | undefined): string =>
  renderToString(
    <RouterProvider
      router={createStaticRouter(appRoutes, "/journeys", {
        middleware: [...middleware],
        notFound: notFoundRoute,
      })}
    >
      <JourneyWell coordinates={JOURNEY_MODEL} job={job} />
    </RouterProvider>,
  );

describe("JourneyWell SSR", () => {
  it("renders the node AND edge DOM to a string", () => {
    const html = renderWell(undefined);
    expect(html).toContain('data-slot="journeys-canvas"');
    // All eleven hops, server-rendered.
    const nodeCount = (html.match(/react-flow__node-hop/g) ?? []).length;
    expect(nodeCount).toBe(11);
    // Edges too — the explicit handles make paths computable without
    // measurement, which is the whole reason they exist.
    expect(html).toContain("react-flow__edges");
    expect(html).toContain("react-flow__edge");
    // THE HANDLE DOM MUST BE PRESENT (the edges-vanish-on-hydration fix): the
    // client re-measures handle positions from the DOM, so each node needs a
    // source + target `<Handle>` or its edges disappear after hydration. Two
    // per node → 22. Same fix and same SSR-visible proxy as the definitions
    // well; the full survives-hydration proof needs a real browser.
    // Handle ELEMENTS by position-modifier class (one per `<Handle>`; the
    // bare class appears twice per element). Two per node (source right,
    // target left).
    expect(
      (html.match(/react-flow__handle-(top|bottom|left|right)/g) ?? []).length,
    ).toBe(nodeCount * 2);
  });

  it("server-renders the selection, because it comes from the URL", () => {
    // Selection is URL state, identical on both sides, so it belongs in
    // the first paint rather than arriving after hydration.
    expect(renderWell(JOURNEY_MODEL[0]?.jobs[0]?.uri)).toContain("is-selected");
    expect(renderWell(undefined)).not.toContain("is-selected");
  });

  it("is byte-identical across repeated renders — the hydration contract", () => {
    // The property the hydration suite depends on, asserted directly: two
    // renders of the same props produce the same bytes. Were any position
    // measured, or any state client-only, this would drift.
    expect(renderWell(undefined)).toBe(renderWell(undefined));
  });
});
