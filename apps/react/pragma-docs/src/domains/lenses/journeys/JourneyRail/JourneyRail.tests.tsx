/**
 * The rail's two load-bearing claims:
 *
 * 1. IT DIMS, IT NEVER HIDES. Every coordinate and every job stays in the
 *    document under every filter, so the index is complete and stable and
 *    the number of things that EXIST never appears to change.
 * 2. THE PERSONA AXIS CONFESSES. It is approximate, and the caveat is
 *    real on-screen text rather than a tooltip — because a filter that
 *    quietly lies is worse than no filter at all.
 */

import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import {
  JOURNEY_MODEL,
  MAKER_COORDINATE,
  PERSONA_ARCHITECT,
  PERSONA_WRITER,
  PERSONAS,
  ROLES_BY_COORDINATE,
  WILDCARD_COORDINATE,
} from "../__fixtures__/journeyModel.js";
import { ALL_JOURNEYS_FILTER, type JourneyFilter } from "../journeyFilter.js";
import JourneyRail from "./JourneyRail.js";

const renderRail = (
  filter: JourneyFilter = ALL_JOURNEYS_FILTER,
): { onFilterChange: ReturnType<typeof vi.fn> } => {
  const onFilterChange = vi.fn();
  const tree: ReactElement = (
    <RouterProvider
      router={createStaticRouter(appRoutes, "/journeys", {
        middleware: [...middleware],
        notFound: notFoundRoute,
      })}
    >
      <JourneyRail
        coordinates={JOURNEY_MODEL}
        filter={filter}
        job={undefined}
        onFilterChange={onFilterChange}
        personas={PERSONAS}
        rolesByCoordinate={ROLES_BY_COORDINATE}
      />
    </RouterProvider>
  );
  render(tree);
  return { onFilterChange };
};

/** Coordinate list items, with their dim state — the index as rendered. */
const coordinateRows = (): { label: string; dimmed: boolean }[] =>
  [...document.querySelectorAll(".journey-rail-list > li")].map((row) => ({
    label:
      row.querySelector(".journey-rail-coordinate")?.textContent ?? "(none)",
    dimmed: row.getAttribute("data-dimmed") === "true",
  }));

describe("JourneyRail", () => {
  it("lists every job — the complete keyboard path through the lens", () => {
    renderRail();
    // Every job still has a link; the accessible name now leads with its
    // legible gist and keeps the slug reachable, so each is found by its
    // slug appearing in the name (job.b2 and job.orphan have no story, so
    // the slug IS the name; job.l3 has a story, tested below).
    for (const name of [/job\.l3/, /job\.orphan/, /job\.b2/]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    // The unserved job is NAMED as such rather than left to an absence.
    expect(screen.getByText("unserved")).toBeInTheDocument();
  });

  it("shows a job's STORY-DERIVED label, not its filing slug — the fix", () => {
    // FIX 1: the rail was "almost illegible" showing `job.l3`. The legible
    // line is the first clause of the job's own story.
    renderRail();
    // The story's first clause leads as visible text.
    expect(
      screen.getByText("When I browse the component catalogue"),
    ).toBeInTheDocument();
    // TEETH: it is NOT the bare slug leading — the slug is demoted, present
    // but not the human label. The gist and the slug are distinct nodes.
    const gist = screen.getByText("When I browse the component catalogue");
    expect(gist).toHaveClass("journey-rail-job-gist");
    // The slug is still reachable — demoted, not deleted.
    expect(document.querySelector(".journey-rail-job-uri")?.textContent).toBe(
      "job.l3",
    );
    // The full story rides as the link's tooltip for the truncated case.
    const link = gist.closest("a");
    expect(link).toHaveAttribute(
      "title",
      "When I browse the component catalogue, I want the whole set at a glance",
    );
  });

  it("falls back to the slug for a storyless job — the other tooth", () => {
    // job.orphan carries no story: the slug IS the legible label, and it is
    // not duplicated as demoted secondary text.
    renderRail();
    const orphanLink = screen.getByRole("link", { name: /job\.orphan/ });
    expect(
      orphanLink.querySelector(".journey-rail-job-gist")?.textContent,
    ).toBe("job.orphan");
    // No demoted-uri line, because the gist already is the slug.
    expect(orphanLink.querySelector(".journey-rail-job-uri")).toBeNull();
  });

  it("DIMS under a coordinate filter and never HIDES", () => {
    renderRail({ coordinate: MAKER_COORDINATE, persona: undefined });
    const rows = coordinateRows();
    // Both coordinates are still present — the index stays complete.
    expect(rows.length).toBe(2);
    expect(rows.filter((row) => row.dimmed).length).toBe(1);
    // And every job is still in the document, dimmed or not.
    expect(screen.getByRole("link", { name: "job.b2" })).toBeInTheDocument();
  });

  it("dims by the APPROXIMATE persona axis — and spares the wildcard", () => {
    // `writer` matches the maker coordinate by role name; the builder
    // coordinate has an EMPTY role axis, which the ontology reads as
    // "any role", so it must be spared rather than dimmed. Both survive,
    // so nothing dims.
    renderRail({ coordinate: undefined, persona: PERSONA_WRITER });
    expect(coordinateRows().every((row) => !row.dimmed)).toBe(true);
  });

  it("dims the named coordinate for a persona it does not match", () => {
    renderRail({ coordinate: undefined, persona: PERSONA_ARCHITECT });
    const rows = coordinateRows();
    const maker = rows.find((row) => row.label.includes("writer"));
    const wildcard = rows.find((row) => row.label.includes("any role"));
    expect(maker?.dimmed).toBe(true);
    // The wildcard axis matches every persona, by the ontology's own rule.
    expect(wildcard?.dimmed).toBe(false);
  });

  it("states the persona axis's approximation as real text", () => {
    renderRail();
    // The caveat is on-screen prose, not a title attribute.
    expect(
      screen.getByText(/Approximate: the graph records no persona-to-job edge/),
    ).toBeInTheDocument();
  });

  it("offers one chip per live persona plus the everyone default", () => {
    renderRail();
    const group = screen.getByRole("group", { name: "Filter by persona" });
    expect(within(group).getAllByRole("button").length).toBe(
      PERSONAS.length + 1,
    );
    expect(
      within(group).getByRole("button", { name: "Everyone" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles a coordinate on, and off again", () => {
    const { onFilterChange } = renderRail();
    fireEvent.click(
      screen.getByRole("button", {
        name: "any actor × writer × any fluency",
      }),
    );
    expect(onFilterChange.mock.calls[0]?.[0]).toEqual({
      coordinate: MAKER_COORDINATE,
      persona: undefined,
    });
  });

  it("clears a coordinate filter back to every coordinate", () => {
    const { onFilterChange } = renderRail({
      coordinate: WILDCARD_COORDINATE,
      persona: undefined,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Show every coordinate" }),
    );
    expect(onFilterChange.mock.calls[0]?.[0]).toEqual({
      coordinate: undefined,
      persona: undefined,
    });
  });
});
