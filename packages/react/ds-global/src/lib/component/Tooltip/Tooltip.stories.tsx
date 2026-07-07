import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#lib/component/Icon/index.js";
import Component from "./Tooltip.js";

/**
 * Render on a real surface: `.surface` defines the `--surface-color-*` channels
 * and the div paints itself with them (surfaces consume themselves), so the
 * `.contrasted` tooltip inverts against a genuine surface.
 */
const surface: Decorator = (Story) => (
  <div
    className="surface"
    style={{
      background: "var(--surface-color-background)",
      color: "var(--surface-color-text)",
      padding: "var(--dimension-300, 24px)",
    }}
  >
    <Story />
  </div>
);

const meta = {
  title: "_work_in_progress/component/Tooltip",
  component: Component,
  decorators: [surface],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The presentational tooltip. Its arrow only appears when a placement class
 * (`top`/`bottom`/`left`/`right`) is set — that class is normally supplied by
 * the positioning layer (TooltipArea / useDisclosure). Here it is set directly
 * so the arrow is visible in isolation.
 */
export const Default: Story = {
  args: {
    children: "Lorem ipsum dolor sit amet",
    className: "top",
    isOpen: true,
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Icon icon="information" />,
    children: "The standard tooltip explains an icon or control.",
    className: "top",
    isOpen: true,
  },
};

export const Multiline: Story = {
  args: {
    icon: <Icon icon="information" />,
    children:
      "The standard tooltip explains an icon or control, or adds a short clarification that runs across several lines when the content is long.",
    className: "top",
    isOpen: true,
  },
};
