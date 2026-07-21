import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import {
  JOURNEY_MODEL,
  MAKER_COORDINATE,
  PERSONA_ARCHITECT,
  PERSONAS,
  ROLES_BY_COORDINATE,
} from "../__fixtures__/journeyModel.js";
import { ALL_JOURNEYS_FILTER } from "../journeyFilter.js";
import JourneyRail from "./JourneyRail.js";

const bareRoutes = {
  journeysJob: route({ url: "/journeys/:job", component: () => null }),
} as const;

const meta: Meta<typeof JourneyRail> = {
  title: "Journeys/JourneyRail",
  component: JourneyRail,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
  args: {
    coordinates: JOURNEY_MODEL,
    job: undefined,
    personas: PERSONAS,
    rolesByCoordinate: ROLES_BY_COORDINATE,
  },
};

export default meta;
type Story = StoryObj<typeof JourneyRail>;

/** The complete demand index, nothing filtered. */
export const Default: Story = { args: { filter: ALL_JOURNEYS_FILTER } };

/** Under a coordinate filter: the excluded rows DIM, they never vanish. */
export const CoordinateFiltered: Story = {
  args: { filter: { coordinate: MAKER_COORDINATE, persona: undefined } },
};

/**
 * The APPROXIMATE persona axis. `architect` matches no role name in this
 * fixture, so the coordinate that names `writer` dims — while the
 * coordinate with an EMPTY role axis is spared, because the ontology reads
 * an unconstrained axis as "any role" rather than as a gap.
 */
export const PersonaApproximate: Story = {
  args: { filter: { coordinate: undefined, persona: PERSONA_ARCHITECT } },
};
