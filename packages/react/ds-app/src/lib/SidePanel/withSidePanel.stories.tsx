import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
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
 * The trigger toggles the panel: first click opens, second closes. Escape and
 * the header's close button dismiss it too — the HOC has no state to be told
 * about.
 *
 * The story's `play` clicks the trigger so the snapshot captures the panel
 * open; in the canvas you can click it yourself, both directions.
 */
const TogglePanel: WithSidePanelRender = ({ ref }) => (
  <Component ref={ref}>
    <Component.Header>Panel title</Component.Header>
    <Component.Content>
      <p>The application behind this panel is still usable.</p>
    </Component.Content>
  </Component>
);

const TogglePanelButton = withSidePanel(Button, TogglePanel);

/**
 * The factory receives `close` too — for content with its own exit routes, a
 * form's footer buttons say.
 */
const FormPanel: WithSidePanelRender = ({ close, ref }) => (
  <Component ref={ref}>
    <Component.Header>Add machine</Component.Header>
    <Component.Content>
      <p>A form would live here, exiting through `close`.</p>
    </Component.Content>
    <Component.Footer>
      <Button onClick={close}>Cancel</Button>
      <Button importance="primary" anticipation="constructive" onClick={close}>
        Save
      </Button>
    </Component.Footer>
  </Component>
);

const FormPanelButton = withSidePanel(Button, FormPanel);

/**
 * A panel composed without a header names itself through `aria-label`
 * instead, and wires its own way out: without a header there is no close
 * button either.
 */
const HeaderlessPanel: WithSidePanelRender = ({ close, ref }) => (
  <Component ref={ref} aria-label="Ubuntu mission">
    <Component.Content>
      We deliver the world's free software, freely, to everybody on the same
      terms. Whether you are a student or a global bank, you can download and
      use Ubuntu free of charge.
    </Component.Content>
    <Component.Footer>
      <Button importance="primary" onClick={close}>
        Got it
      </Button>
    </Component.Footer>
  </Component>
);

const OpenPanelButton = withSidePanel(Button, HeaderlessPanel);

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

/** One component: the trigger plus the panel it toggles. */
export const Toggle: Story = {
  render: () => (
    <div style={{ padding: "1rem" }}>
      <TogglePanelButton>Toggle panel</TogglePanelButton>
    </div>
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

const TogglePanel: WithSidePanelRender = ({ ref }) => (
  <SidePanel ref={ref}>
    <SidePanel.Header>Panel title</SidePanel.Header>
    <SidePanel.Content>
      <p>The application behind this panel is still usable.</p>
    </SidePanel.Content>
  </SidePanel>
);

const TogglePanelButton = withSidePanel(Button, TogglePanel);

<TogglePanelButton>Toggle panel</TogglePanelButton>
        `,
      },
    },
  },
};

/** Content that owns its exits: the factory receives `close`. */
export const CloseFromContent: Story = {
  render: () => (
    <div style={{ padding: "1rem" }}>
      <FormPanelButton importance="primary">Add machine</FormPanelButton>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add machine" }));
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

const FormPanel: WithSidePanelRender = ({ close, ref }) => (
  <SidePanel ref={ref}>
    <SidePanel.Header>Add machine</SidePanel.Header>
    <SidePanel.Content>
      <MachineForm
        onCancel={close}
        onSubmit={(data) => { save(data); close(); }}
      />
    </SidePanel.Content>
    <SidePanel.Footer>
      <Button onClick={close}>Cancel</Button>
      <Button importance="primary" anticipation="constructive" onClick={close}>
        Save
      </Button>
    </SidePanel.Footer>
  </SidePanel>
);

const FormPanelButton = withSidePanel(Button, FormPanel);

<FormPanelButton importance="primary">Add machine</FormPanelButton>
        `,
      },
    },
  },
};

/**
 * This story exists solely to show one rule: a panel composed without a
 * header has no title to name it, so it must carry its own `aria-label`.
 * Without a header there is also no close button, so the footer's action is
 * the visible way out.
 */
export const WithoutHeader: Story = {
  render: () => (
    <div style={{ padding: "1rem" }}>
      <OpenPanelButton>Open panel</OpenPanelButton>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open panel" }));
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

const HeaderlessPanel: WithSidePanelRender = ({ close, ref }) => (
  <SidePanel ref={ref} aria-label="Ubuntu mission">
    <SidePanel.Content>
      We deliver the world's free software, freely, to everybody on the same
      terms. Whether you are a student or a global bank, you can download and
      use Ubuntu free of charge.
    </SidePanel.Content>
    <SidePanel.Footer>
      {/* With no header there is no close button — the footer is the way out */}
      <Button importance="primary" onClick={close}>Got it</Button>
    </SidePanel.Footer>
  </SidePanel>
);

const OpenPanelButton = withSidePanel(Button, HeaderlessPanel);

<OpenPanelButton>Open panel</OpenPanelButton>
        `,
      },
    },
  },
};
WithoutHeader.storyName = "Without a header";
