import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../.storybook/decorators/index.js";
import LensBreadcrumbs from "./LensBreadcrumbs.js";

/** Name-compatible bare routes so the back-link crumb's `to={lensRouteName}`
 * resolves without mounting the app's real pages. */
const bareRoutes = {
  home: route({ url: "/", component: () => null }),
  components: route({ url: "/components", component: () => null }),
  definitions: route({ url: "/definitions", component: () => null }),
  standards: route({ url: "/standards", component: () => null }),
  journeys: route({ url: "/journeys", component: () => null }),
} as const;

const meta: Meta<typeof LensBreadcrumbs> = {
  title: "Shell/LensBreadcrumbs",
  component: LensBreadcrumbs,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof LensBreadcrumbs>;

/** A lens index: one crumb, the lens name, the current page (text). */
export const Index: Story = {
  args: { lensLabel: "Components", lensRouteName: "components" },
};

/** An entity page: the lens crumb links back to the index, the entity crumb
 * is the current page. The crumb text is the URL-derived identity. */
export const Entity: Story = {
  args: {
    lensLabel: "Components",
    lensRouteName: "components",
    current: "ds:global.component.button",
  },
};
