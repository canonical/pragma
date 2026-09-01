import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../component/Button/index.js";
import { Chip } from "../../component/Chip/index.js";
import { InlineCode } from "../../component/InlineCode/index.js";
import { KeyboardKey } from "../../component/KeyboardKey/index.js";
import Modal from "./Modal.js";

const meta = {
  title: "patterns/Modal",
  component: Modal,
  // Docs previews render in an iframe: showModal() puts the dialog in the
  // page's top layer, which escapes every container — inside an iframe the
  // top layer is the preview window itself, so each story's open modal stays
  // contained instead of stacking over the docs page.
  parameters: {
    docs: {
      story: {
        inline: false,
        iframeHeight: "480px",
      },
      // The stories use custom renders, so autodocs' default "dynamic" source
      // (reconstructed from args, in the docs frame) has nothing to show —
      // doubly so with the iframed previews above. Serve the consumer-facing
      // snippet explicitly instead.
      source: { type: "code", language: "tsx" },
    },
  },
  // Every story renders the modal open: a story is a picture of the pattern,
  // not a demo of its trigger.
  args: { open: true, children: null },
  argTypes: {
    // The stories compose their sections in a custom render, never from args.
    children: { control: false },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The full anatomy, composed from its sections: a header with the title and
 * the dismiss icon, the content, and two actions bounded by the horizontal
 * rules. The affirmative action is last and carries the constructive
 * anticipation, which is where the green fill comes from.
 */
export const Default: Story = {
  parameters: {
    docs: {
      source: {
        code: `<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Content>
    lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua.
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary">Cancel</Button>
    <Button importance="primary" anticipation="constructive">
      Confirm
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ open }) => (
    <Modal open={open}>
      <Modal.Header>Title</Modal.Header>
      <Modal.Content>
        lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </Modal.Content>
      <Modal.Footer>
        <Button importance="secondary">Cancel</Button>
        <Button importance="primary" anticipation="constructive">
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  ),
};

/**
 * A destructive confirmation. The consequence is spelled out in the content
 * and the affirmative action carries the matching anticipation modifier.
 */
export const DestructiveConfirmation: Story = {
  parameters: {
    docs: {
      source: {
        code: `<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>Delete instance</Modal.Header>
  <Modal.Content>
    Deleting this instance removes its volumes and snapshots. This cannot be
    undone.
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary">Cancel</Button>
    <Button importance="primary" anticipation="destructive">
      Delete
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ open }) => (
    <Modal open={open}>
      <Modal.Header>Delete instance</Modal.Header>
      <Modal.Content>
        Deleting this instance removes its volumes and snapshots. This cannot be
        undone.
      </Modal.Content>
      <Modal.Footer>
        <Button importance="secondary">Cancel</Button>
        <Button importance="primary" anticipation="destructive">
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  ),
};

/**
 * No dismiss icon and backdrop clicks are ignored, so the visible way out is
 * an action — Escape still closes the modal, as it always does.
 */
export const NotDismissible: Story = {
  parameters: {
    docs: {
      source: {
        code: `<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header dismissible={false}>Unsaved changes</Modal.Header>
  <Modal.Content>
    You have unsaved changes that will be lost if you continue.
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary">Keep editing</Button>
    <Button importance="primary" anticipation="destructive">
      Discard
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ open }) => (
    <Modal open={open}>
      <Modal.Header dismissible={false}>Unsaved changes</Modal.Header>
      <Modal.Content>
        You have unsaved changes that will be lost if you continue.
      </Modal.Content>
      <Modal.Footer>
        <Button importance="secondary">Keep editing</Button>
        <Button importance="primary" anticipation="destructive">
          Discard
        </Button>
      </Modal.Footer>
    </Modal>
  ),
};

/**
 * Supplementary context with nothing to decide, so the footer is simply not
 * composed.
 */
export const WithoutActions: Story = {
  parameters: {
    docs: {
      source: {
        code: `<Modal open={open} onOpenChange={setOpen} closeOnBackdropClick>
  <Modal.Header>Search syntax</Modal.Header>
  <Modal.Content>
    Combine terms with AND, OR and NOT. Quote a phrase to match it exactly.
  </Modal.Content>
</Modal>`,
      },
    },
  },
  render: ({ open }) => (
    <Modal open={open} closeOnBackdropClick>
      <Modal.Header>Search syntax</Modal.Header>
      <Modal.Content>
        Combine terms with AND, OR and NOT. Quote a phrase to match it exactly.
      </Modal.Content>
    </Modal>
  ),
};

/**
 * Content is an open slot, not a text field: it takes arbitrary React, so
 * other components compose inside it. Here a paragraph, a KeyboardKey
 * shortcut hint, an InlineCode command and a row of Chips share one modal.
 * Each child brings its own margins, so the slot's outermost element owns
 * the spacing rather than leaving the browser defaults to stack on top of
 * the content padding.
 */
export const RichContent: Story = {
  parameters: {
    docs: {
      source: {
        code: `<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>Connect to instance</Modal.Header>
  <Modal.Content>
    <div style={{ display: "grid", gap: "var(--dimension-200, 16px)", margin: 0 }}>
      <p style={{ margin: 0 }}>
        The instance accepts SSH on its public address. Press{" "}
        <KeyboardKey keyValue="cmd" /> <KeyboardKey keyValue="c" /> to copy the
        command below.
      </p>
      <InlineCode>ssh ubuntu@10.0.1.42 -i ~/.ssh/id_ed25519</InlineCode>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dimension-100, 8px)" }}>
        <Chip lead="Status" value="Running" criticality="success" />
        <Chip lead="Image" value="ubuntu:24.04" />
        <Chip lead="Agent" value="beta" release="beta" />
      </div>
    </div>
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary">Cancel</Button>
    <Button importance="primary" anticipation="constructive">
      Connect
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ open }) => (
    <Modal open={open}>
      <Modal.Header>Connect to instance</Modal.Header>
      <Modal.Content>
        <div
          style={{
            display: "grid",
            gap: "var(--dimension-200, 16px)",
            margin: 0,
          }}
        >
          <p style={{ margin: 0 }}>
            The instance accepts SSH on its public address. Press{" "}
            <KeyboardKey keyValue="cmd" /> <KeyboardKey keyValue="c" /> to copy
            the command below.
          </p>
          <InlineCode>ssh ubuntu@10.0.1.42 -i ~/.ssh/id_ed25519</InlineCode>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--dimension-100, 8px)",
            }}
          >
            <Chip lead="Status" value="Running" criticality="success" />
            <Chip lead="Image" value="ubuntu:24.04" />
            <Chip lead="Agent" value="beta" release="beta" />
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button importance="secondary">Cancel</Button>
        <Button importance="primary" anticipation="constructive">
          Connect
        </Button>
      </Modal.Footer>
    </Modal>
  ),
};

/**
 * Only the content pane scrolls: the header and footer stay in place, and the
 * dialog never grows past --modal-max-block-size.
 */
export const LongContent: Story = {
  parameters: {
    docs: {
      source: {
        code: `<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>Terms</Modal.Header>
  <Modal.Content>
    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
  </Modal.Content>
  <Modal.Footer>
    <Button importance="primary" anticipation="constructive">
      Accept
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ open }) => (
    <Modal open={open}>
      <Modal.Header>Terms</Modal.Header>
      <Modal.Content>
        {Array.from(
          { length: 30 },
          (_, index) =>
            `Paragraph ${index + 1} of scrolling placeholder content.`,
        ).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Modal.Content>
      <Modal.Footer>
        <Button importance="primary" anticipation="constructive">
          Accept
        </Button>
      </Modal.Footer>
    </Modal>
  ),
};
