import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import { buildJourneyRows, DEFAULT_TABLE_STATE } from "../journeyTableModel.js";
import JourneyTable from "./JourneyTable.js";

const bareRoutes = {
  journeysJob: route({ url: "/journeys/:job", component: () => null }),
} as const;

/** The fixture model flattened into rows, one job carrying a story so the
 * secondary-text and detail paths are visible in the story. */
const rows = buildJourneyRows(JOURNEY_MODEL, {
  "sem://design-system-docs#job.l3": {
    story: "A reader browses the component catalogue.",
    acceptances: ["Every component is listed.", "Each links to its page."],
    roles: ["sem://design-system-docs#role.writer"],
  },
});

const meta: Meta<typeof JourneyTable> = {
  title: "Journeys/JourneyTable",
  component: JourneyTable,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
  args: {
    rows,
    expanded: new Set<string>(),
    job: undefined,
    onStateChange: () => {},
    onToggleExpanded: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof JourneyTable>;

/** The default arrangement: grouped by coordinate, jobs alphabetical. */
export const Default: Story = { args: { state: DEFAULT_TABLE_STATE } };

/** Sorted by pairing count, most-paired first — the "which coordinate
 * carries the most demand?" reading the old list could not answer. */
export const SortedByPairings: Story = {
  args: {
    state: { sort: "pairings", direction: "descending", group: "none" },
  },
};

/** Grouped by served state, so the unserved block reads as one thing. */
export const GroupedByState: Story = {
  args: {
    state: { sort: "job", direction: "ascending", group: "served" },
  },
};

/** A job expanded, its story and acceptance criteria in a detail row. */
export const Expanded: Story = {
  args: {
    state: DEFAULT_TABLE_STATE,
    expanded: new Set<string>(["sem://design-system-docs#job.l3"]),
  },
};
