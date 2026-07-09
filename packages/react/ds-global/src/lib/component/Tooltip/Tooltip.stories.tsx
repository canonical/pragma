import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../../component/Icon/index.js";
import Component from "./Tooltip.js";

/**
 * A tall, centred stage on a real surface — matching the TooltipArea, Popover,
 * and ContextualMenu stories. `.surface` defines the `--surface-color-*`
 * channels and the div paints itself with them (surfaces consume themselves),
 * so the `.contrasted` tooltip inverts against a genuine surface.
 */
const surface: Decorator = (Story) => (
  <div
    className="surface"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      inlineSize: "100%",
      blockSize: "100%",
      minInlineSize: "min(88vw, 480px)",
      minBlockSize: "440px",
      background: "var(--surface-color-background)",
      color: "var(--surface-color-text)",
    }}
  >
    <Story />
  </div>
);

const meta = {
  title: "components/Tooltip",
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
