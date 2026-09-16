import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";
import SidePanel from "./Provider.js";
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
  <SidePanel ref={ref}>
    <SidePanel.Header>Panel title</SidePanel.Header>
    <SidePanel.Content>
      <p>The application behind this panel is still usable.</p>
    </SidePanel.Content>
  </SidePanel>
);

const TogglePanelButton = withSidePanel(Button, TogglePanel);

/**
 * The factory receives `close` too — for content with its own exit routes, a
 * form's footer buttons say.
 */
const FormPanel: WithSidePanelRender = ({ close, ref }) => (
  <SidePanel ref={ref}>
    <SidePanel.Header>Add machine</SidePanel.Header>
    <SidePanel.Content>
      <p>A form would live here, exiting through `close`.</p>
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

const meta = {
  title: "Components/SidePanel/withSidePanel",
  parameters: {
    docs: {
      description: {
        component: `
Pairs a trigger with a panel it toggles — for **transient, local panels**:
forms, filters, anything that the consumer doesn't need to know the state of
the side panel. The dialog's native open state is the only one; the toggle
reads it and flips it.

The trigger can be anything that takes an \`onClick\` — a \`Button\`, the
router's \`Link\`, a bare anchor — and its own \`onClick\` still runs,
first, when pressed.

The second argument is a **factory**: the HOC calls it with \`{ close, ref }\`
and it returns the complete \`<SidePanel>\` element, so everything the panel
accepts lives on that element. The factory must attach the \`ref\` it
receives — \`<SidePanel ref={ref}>\` — because the trigger toggles the panel
through it; \`SidePanel\` requires its \`ref\`, so forgetting it is a compile
error, not a silent nothing.
        `,
      },
      story: {
        // The panel is `position: fixed`: inside its own iframe it fills the
        // frame and stays contained in the docs page.
        inline: false,
        iframeHeight: "30rem",
      },
    },
  },
} satisfies Meta;

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
