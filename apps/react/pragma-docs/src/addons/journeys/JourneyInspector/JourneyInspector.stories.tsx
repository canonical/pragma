import type { Meta, StoryObj } from "@storybook/react-vite";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import JourneyInspector from "./JourneyInspector.js";

const meta: Meta<typeof JourneyInspector> = {
  title: "Journeys/JourneyInspector",
  component: JourneyInspector,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof JourneyInspector>;

/** A selected job: story verbatim, acceptances, coordinate in words. */
export const Default: Story = {
  args: {
    job: {
      uri: "sem://design-system-docs#job.l3",
      label: "job.l3",
      story:
        "When I don't yet know what exists, I want to browse and filter the full catalog, so I can find what exists and what it does, without reading source.",
      acceptances: ["listing + filters; Cmd-K; agents get listEntities"],
      coordinate: "any actor × writer × any fluency",
      pairings: JOURNEY_MODEL[0].jobs[0].pairings,
    },
  },
};

/** Demand nothing serves — the most actionable thing the lens can show. */
export const Unserved: Story = {
  args: {
    job: {
      uri: "sem://design-system-docs#job.orphan",
      label: "job.orphan",
      story: "When nothing serves me, I want that to be visible.",
      acceptances: [],
      coordinate: "any actor × any role × any fluency",
      pairings: [],
    },
  },
};

/** The index's honest empty state. */
export const NoSelection: Story = { args: { job: undefined } };
