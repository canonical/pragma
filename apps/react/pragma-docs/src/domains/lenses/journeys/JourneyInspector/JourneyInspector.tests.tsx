/**
 * The inspector's contract: it reports the model VERBATIM and invents
 * nothing. The tests below are mostly about what it must NOT do — no
 * paraphrase, no default arrival, no dead links.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import JourneyInspector from "./JourneyInspector.js";
import type { InspectedJob } from "./types.js";

const STORY =
  "When I don't yet know what exists, I want to browse and filter the full catalog, so I can find what exists and what it does, without reading source.";

const BROWSE: InspectedJob = {
  uri: "sem://design-system-docs#job.l3",
  label: "job.l3",
  story: STORY,
  acceptances: ["listing + filters; Cmd-K; agents get listEntities"],
  coordinate: "any actor × writer × any fluency",
  pairings: JOURNEY_MODEL[0]?.jobs[0]?.pairings ?? [],
};

describe("JourneyInspector", () => {
  it("renders the story VERBATIM — never a paraphrase", () => {
    render(<JourneyInspector job={BROWSE} />);
    // The whole value of a demand model is that it records what someone
    // actually said, so the text must survive unedited.
    expect(screen.getByText(STORY)).toBeInTheDocument();
  });

  it("lists the acceptance criteria and spells the coordinate out in words", () => {
    render(<JourneyInspector job={BROWSE} />);
    expect(
      screen.getByText("listing + filters; Cmd-K; agents get listEntities"),
    ).toBeInTheDocument();
    // Including its wildcards — "any fluency" is the ontology's reading of
    // an unconstrained axis, not padding.
    expect(
      screen.getByText("any actor × writer × any fluency"),
    ).toBeInTheDocument();
  });

  it("shows each pairing's role, and omits an ABSENT arrival entirely", () => {
    render(<JourneyInspector job={BROWSE} />);
    const facets = [...document.querySelectorAll("[data-facet]")].map(
      (node) => `${node.getAttribute("data-facet")}:${node.textContent}`,
    );
    // The first pairing carries both; the second carries no arrival at
    // all, so no arrival facet is emitted for it — absence is data.
    expect(facets).toContain("role:Primary");
    expect(facets).toContain("arrival:ColdEntry");
    expect(facets).toContain("role:Secondary");
    expect(facets.filter((facet) => facet.startsWith("arrival:")).length).toBe(
      1,
    );
  });

  it("states honest absence of a layout in words", () => {
    render(<JourneyInspector job={BROWSE} />);
    expect(screen.getByText("composes no layout")).toBeInTheDocument();
    expect(screen.getByText("Catalog")).toBeInTheDocument();
  });

  it("links a surface only where the docsite renders one", () => {
    render(<JourneyInspector job={BROWSE} />);
    expect(
      screen
        .getByRole("link", { name: "view.components" })
        .getAttribute("href"),
    ).toBe("/components");
    // The routeless surface is text — a dead link would be the worse lie.
    expect(screen.queryByRole("link", { name: "view.chips" })).toBeNull();
    expect(screen.getByText("view.chips")).toBeInTheDocument();
  });

  it("says so plainly when NOTHING serves the job", () => {
    render(
      <JourneyInspector
        job={{ ...BROWSE, label: "job.orphan", pairings: [] }}
      />,
    );
    expect(
      screen.getByText("No surface is paired to this job."),
    ).toBeInTheDocument();
  });

  it("renders an honest empty state with no job selected", () => {
    render(<JourneyInspector job={undefined} />);
    expect(
      screen.getByText(/Select a job to read its story/),
    ).toBeInTheDocument();
  });
});
