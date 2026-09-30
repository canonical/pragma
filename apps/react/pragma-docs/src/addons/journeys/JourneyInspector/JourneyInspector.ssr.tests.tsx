/**
 * The inspector's SSR posture: the selected job's story and facets are in
 * the server HTML, so the lens reads without client JS.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import JourneyInspector from "./JourneyInspector.js";

describe("JourneyInspector SSR", () => {
  it("renders the job's story and pairings to a string", () => {
    const html = renderToString(
      <JourneyInspector
        job={{
          uri: "sem://design-system-docs#job.l3",
          label: "job.l3",
          story: "When I browse, I want the catalog.",
          acceptances: ["listing + filters"],
          coordinate: "any actor × writer × any fluency",
          pairings: JOURNEY_MODEL[0]?.jobs[0]?.pairings ?? [],
        }}
      />,
    );

    expect(html).toContain('data-slot="journeys-inspector"');
    expect(html).toContain("When I browse, I want the catalog.");
    expect(html).toContain("composes no layout");
  });

  it("renders the honest empty state with no selection", () => {
    const html = renderToString(<JourneyInspector job={undefined} />);
    expect(html).toContain("Select a job");
  });
});
