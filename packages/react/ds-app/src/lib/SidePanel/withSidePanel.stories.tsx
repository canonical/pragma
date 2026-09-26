import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, useState } from "react";
import { userEvent } from "storybook/test";
import Component from "./Provider.js";
import type { WithSidePanelRender } from "./types.js";
import withSidePanel from "./withSidePanel.js";

/*
 * The panel definitions and their wrapped triggers live at module scope, not
 * in the story bodies: a `withSidePanel` call produces a component type, and
 * a new type per render would remount the story every time it re-renders.
 * Defined once, they are also the shape consumers should copy.
 */

/**
 * Static information belongs in a fixed panel: the trigger, Escape, and the
 * header's close button are its only exit paths.
 *
 * The story's `play` clicks the trigger so the snapshot captures the panel
 * open; in the canvas you can click it yourself, both directions.
 */
const StaticInfoPanel: WithSidePanelRender = ({ ref }) => (
  <Component ref={ref}>
    <Component.Header>Ubuntu Pro</Component.Header>
    <Component.Content>
      <p>
        Ubuntu Pro is Canonical&apos;s security and compliance subscription,
        covering every open source in Ubuntu for up to 15 years. The application
        behind this panel is still usable.
      </p>
    </Component.Content>
  </Component>
);

const StaticInfoButton = withSidePanel(Button, StaticInfoPanel);

type InitialTransitionDisabledProps = {
  children: (onClick: () => void) => ReactElement;
};

/**
 * Opens a story panel without motion for its first visual snapshot. The HOC
 * calls the supplied handler before it toggles the dialog, so React removes
 * the override only after that first open; later clicks animate normally.
 */
const InitialTransitionDisabled = ({
  children,
}: InitialTransitionDisabledProps): ReactElement => {
  const [disableTransition, setDisableTransition] = useState(true);

  return (
    <>
      {disableTransition && (
        <style>
          {`
            /* Disable the transition only while the initial play opens the panel. */
            :root {
              --side-panel-transition-duration: 0ms;
            }
          `}
        </style>
      )}
      {children(() => setDisableTransition(false))}
    </>
  );
};

const meta = {
  title: "Components/SidePanel/withSidePanel",
  parameters: {
    docs: {
      story: {
        // The panel is `position: fixed`: inside its own iframe it fills the
        // frame and stays contained in the docs page.
        inline: false,
        iframeHeight: "30rem",
      },
      // The stories use custom renders, so autodocs' default "dynamic" source
      // (reconstructed from args, in the docs frame) has nothing to show —
      // doubly so with the iframed previews above. Serve the consumer-facing
      // snippet explicitly instead.
      source: { type: "code", language: "tsx" },
    },
  },
} satisfies Meta;

/* The docs page for these stories lives in withSidePanel.mdx. */
export default meta;
type Story = StoryObj<typeof meta>;

/** Static content with one trigger and no application-owned panel state. */
export const StaticInfo: Story = {
  render: () => (
    <InitialTransitionDisabled>
      {(onClick) => (
        <div style={{ padding: "1rem" }}>
          <StaticInfoButton onClick={onClick}>Toggle panel</StaticInfoButton>
        </div>
      )}
    </InitialTransitionDisabled>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Toggle panel" }));
  },
  parameters: {
    docs: {
      source: {
        code: `
import { Button } from "@canonical/react-ds-global";
import {
  SidePanel,
  withSidePanel,
  type WithSidePanelRender,
} from "@canonical/react-ds-app";

const StaticInfoPanel: WithSidePanelRender = ({ ref }) => (
  <SidePanel ref={ref}>
    <SidePanel.Header>Ubuntu Pro</SidePanel.Header>
    <SidePanel.Content>
      <p>
        Ubuntu Pro is Canonical's security and compliance subscription,
        covering every open source in Ubuntu for up to 15 years.
      </p>
    </SidePanel.Content>
  </SidePanel>
);

const StaticInfoButton = withSidePanel(Button, StaticInfoPanel);

<StaticInfoButton>Toggle panel</StaticInfoButton>
        `,
      },
    },
  },
};
