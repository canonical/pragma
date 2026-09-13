import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";
import SidePanel from "./SidePanel.js";
import withSidePanel from "./withSidePanel.js";

/**
 * The trigger toggles the panel: first click opens, second closes. Escape and
 * the header's close button dismiss it too — the HOC has no state to be told
 * about.
 *
 * The story's `play` clicks the trigger so the snapshot captures the panel
 * open; in the canvas you can click it yourself, both directions.
 */
const TogglePanelButton = withSidePanel(
  Button,
  <>
    <SidePanel.Header>Panel title</SidePanel.Header>
    <SidePanel.Content>
      <p>The application behind this panel is still usable.</p>
    </SidePanel.Content>
  </>,
);

/**
 * Function children receive a `close` — for content with its own exit
 * routes, a form's footer buttons say.
 */
const FormPanelButton = withSidePanel(Button, (close) => (
  <>
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
  </>
));

const meta = {
  title: "Components/SidePanel/withSidePanel",
  parameters: {
    docs: {
      description: {
        component: `
Pairs a trigger with a panel it toggles — for **transient, local panels**:
forms, filters, anything that the consumer doesn't need to know the state of the side panel. The dialog's native open
state is the only one; the toggle reads it and flips it.

The trigger can be anything that takes an \`onClick\` — a \`Button\`, the
router's \`Link\`, a bare anchor — and its own \`onClick\` still runs,
first, when pressed.
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
import { SidePanel, withSidePanel } from "@canonical/react-ds-app";

const TogglePanelButton = withSidePanel(
  Button,
  <>
    <SidePanel.Header>Panel title</SidePanel.Header>
    <SidePanel.Content>
      <p>The application behind this panel is still usable.</p>
    </SidePanel.Content>
  </>,
);

<TogglePanelButton>Open panel</TogglePanelButton>
        `,
      },
    },
  },
};

/** Content that owns its exits: the function form receives `close`. */
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
import { SidePanel, withSidePanel } from "@canonical/react-ds-app";

const FormPanelButton = withSidePanel(
  Button,
  (close) => (
    <>
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
    </>
  ),
);

<FormPanelButton importance="primary">Add machine</FormPanelButton>
        `,
      },
    },
  },
};
