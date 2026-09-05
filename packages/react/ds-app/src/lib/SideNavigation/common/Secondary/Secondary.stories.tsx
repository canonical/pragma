import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HashLink,
  navDecorators,
  withNavigationRouterProps,
} from "../../../../storybook/navigation/story-utils.js";
import type { SecondaryNavRoot } from "../../types.js";
import Secondary from "./Secondary.js";

const root: SecondaryNavRoot = {
  key: "root",
  items: [
    {
      key: "general",
      label: "General",
      items: [
        { url: "/settings/profile", label: "Profile" },
        { url: "/settings/notifications", label: "Notifications" },
      ],
    },
    { key: "sep", separator: true },
    {
      key: "security",
      label: "Security",
      items: [
        { url: "/settings/password", label: "Password" },
        { url: "/settings/sessions", label: "Sessions" },
      ],
    },
  ],
};

const meta: Meta<typeof Secondary> = {
  title: "Components/SideNavigation/Secondary",
  component: Secondary,
  parameters: { layout: "fullscreen" },
  decorators: [...navDecorators, withNavigationRouterProps],
  args: {
    title: "Account settings",
    root,
    LinkComponent: HashLink,
  },
};

export default meta;
type Story = StoryObj<typeof Secondary>;

/** A second level of navigation, opened alongside (not inside) the primary rail. */
export const Default: Story = {};
