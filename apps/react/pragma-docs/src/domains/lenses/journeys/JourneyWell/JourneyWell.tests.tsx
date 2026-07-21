/**
 * The well as a projection of its props — and the HONEST ABSENCE claim
 * (ruling R2) asserted where a reader would see it: in the rendered graph.
 */

import "../../definitions/__fixtures__/stubReactFlowGlobals.js";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import {
  BROWSE_JOB,
  JOURNEY_MODEL,
  ORPHAN_JOB,
} from "../__fixtures__/journeyModel.js";
import JourneyWell from "./JourneyWell.js";

/** The well under a real router — its job nodes are router links. */
const wellAt = (job: string | undefined): ReactElement => (
  <RouterProvider
    router={createStaticRouter(appRoutes, "/journeys", {
      middleware: [...middleware],
      notFound: notFoundRoute,
    })}
  >
    <JourneyWell coordinates={JOURNEY_MODEL} job={job} />
  </RouterProvider>
);

describe("JourneyWell", () => {
  it("draws one node per hop, and names the canvas", () => {
    render(wellAt(undefined));
    expect(
      screen.getByLabelText("Journeys from demand to surface", {
        selector: ".react-flow",
      }),
    ).toBeInTheDocument();
    // Every hop the fixture implies is drawn: 2 coordinates, 3 jobs,
    // 3 pairings, 2 surfaces, 1 layout.
    expect(document.querySelectorAll(".react-flow__node").length).toBe(11);
  });

  it("renders honest absence: no layout node where none is composed", () => {
    render(wellAt(undefined));
    // `view.chips` composes no layout, so its row ENDS at the surface.
    // The only layout node in the graph is the catalog one.
    const layoutNodes = [
      ...document.querySelectorAll('[data-kind="layout"]'),
    ].map((node) => node.textContent);
    expect(layoutNodes).toEqual(["Catalog"]);
    // …and the chips surface is drawn, so its absence of a layout is a
    // gap in the row rather than a missing surface.
    expect(screen.getByTitle("view.chips")).toBeInTheDocument();
  });

  it("links jobs to their own address, and surfaces only where a route exists", () => {
    render(wellAt(undefined));
    // A job node is a real router link — the job is the addressable thing.
    expect(
      screen.getByRole("link", { name: "job.l3" }).getAttribute("href"),
    ).toBe(appRoutes.journeysJob.render({ job: BROWSE_JOB }));
    // A surface WITH a docsite route links out…
    expect(
      screen
        .getByRole("link", { name: "view.components" })
        .getAttribute("href"),
    ).toBe("/components");
    // …and one WITHOUT is plain text, never a dead link.
    expect(screen.getByTitle("view.chips").tagName).toBe("SPAN");
  });

  it("marks the selected job, and nothing else", () => {
    render(wellAt(BROWSE_JOB));
    const selected = document.querySelectorAll(".react-flow__node.is-selected");
    expect(selected.length).toBe(1);
    expect(selected[0]?.getAttribute("data-id")).toBe(BROWSE_JOB);
  });

  it("draws the job nothing serves — demand without a surface still earns a row", () => {
    render(wellAt(undefined));
    // The orphan job is drawn (it is the most actionable thing the lens
    // can show) and reaches no pairing.
    expect(
      screen.getByRole("link", { name: "job.orphan" }),
    ).toBeInTheDocument();
    const orphanEdges = [...document.querySelectorAll(".react-flow__edge")]
      .map((edge) => edge.getAttribute("data-id") ?? "")
      .filter((id) => id.startsWith(ORPHAN_JOB));
    expect(orphanEdges).toEqual([]);
  });
});
