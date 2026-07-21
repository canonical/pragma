import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { BROWSE_JOB, JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import JourneyWell from "./JourneyWell.js";

const bareRoutes = {
  journeysJob: route({ url: "/journeys/:job", component: () => null }),
} as const;

const meta: Meta<typeof JourneyWell> = {
  title: "Journeys/JourneyWell",
  component: JourneyWell,
  tags: ["autodocs"],
  decorators: [
    withRouter({ routes: bareRoutes }),
    (Story) => (
      <div style={{ blockSize: "24rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof JourneyWell>;

/** The spine, unselected: coordinate → job → pairing → surface → layout. */
export const Default: Story = {
  args: { coordinates: JOURNEY_MODEL, job: undefined },
};

/** With a job selected — selection comes from the URL, so it SSRs. */
export const JobSelected: Story = {
  args: { coordinates: JOURNEY_MODEL, job: BROWSE_JOB },
};

/**
 * HONEST ABSENCE (ruling R2): `view.chips` composes no layout, so its row
 * simply ends at its surface. No layout node is invented and no trailing
 * edge is drawn — the empty column is the coverage signal.
 */
export const HonestAbsence: Story = {
  args: {
    coordinates: [
      {
        ...JOURNEY_MODEL[0],
        jobs: [
          {
            ...JOURNEY_MODEL[0].jobs[0],
            pairings: JOURNEY_MODEL[0].jobs[0].pairings.slice(1),
          },
        ],
      },
    ],
    job: undefined,
  },
};
