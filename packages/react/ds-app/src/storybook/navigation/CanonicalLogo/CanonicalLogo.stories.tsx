import type { Meta, StoryObj } from "@storybook/react-vite";
import { withSideNavShell } from "../story-utils.js";
import CanonicalLogo from "./CanonicalLogo.js";

const meta: Meta<typeof CanonicalLogo> = {
  title: "Components/SideNavigation/CanonicalLogo",
  component: CanonicalLogo,
  // Render flush to the canvas origin (no Storybook padding) so the baseline
  // overlay grid aligns to the component's own box.
  parameters: { layout: "fullscreen" },
  // withSideNavShell provides the .ds.side-navigation context so --sidenav-start
  // and the brand-background token resolve. The fixed-height frame mimics the
  // header so the rectangle's full-height (top→bottom) behaviour is visible.
  decorators: [
    withSideNavShell,
    (Story) => (
      <div style={{ blockSize: "calc(var(--space-baseline) * 5)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CanonicalLogo>;

/** The brand-orange rectangle with the circle-of-friends on the baseline. */
export const Default: Story = {};
