import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";
import { Button } from "../../component/Button/index.js";
import { Chip } from "../../component/Chip/index.js";
import { InlineCode } from "../../component/InlineCode/index.js";
import { KeyboardKey } from "../../component/KeyboardKey/index.js";
import Modal from "./Modal.js";
import type { ModalProps } from "./types.js";

/**
 * Every preview pairs the modal with the trigger a real page would give it, so
 * dismissing the modal leaves something to click rather than an empty frame,
 * and hands `close` to the composed sections so the footer actions work.
 *
 * The wiring is a ref, `showModal()` to open and `close()` to close. The
 * trigger needs no already-open guard, because an open modal makes the page
 * behind it inert and the button unclickable; something that can fire twice —
 * a shortcut, an effect — would check `ref.current.open` first.
 */
const ModalPreview = ({
  children,
  ...modalProps
}: Omit<ModalProps, "children" | "ref"> & {
  children: (close: () => void) => ReactNode;
}): ReactElement => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
      <Modal {...modalProps} ref={modalRef}>
        {children(() => modalRef.current?.close())}
      </Modal>
    </>
  );
};

const meta = {
  title: "patterns/Modal",
  component: Modal,
  // Docs previews render in an iframe: showModal() puts the dialog in the
  // page's top layer, which escapes every container — inside an iframe the
  // top layer is the preview window itself, so each story's open modal stays
  // contained instead of stacking over the docs page.
  parameters: {
    docs: {
      description: {
        component: [
          "The modal is **self-contained**: its open state lives in the native `<dialog>`, not in a",
          "prop, so the header's close icon and Escape dismiss it with nothing wired up (and a",
          "backdrop click too, where `closeOnBackdropClick` opts in). `onClose` is the native way to",
          "hear that it happened.",
          "",
          "**External control is optional and goes through the `ref`**, which is the `<dialog>` itself:",
          "`ref.current?.showModal()` opens the modal and `ref.current?.close()` closes it. That is all",
          "a trigger or a footer action needs. For the common case — one control opening one modal —",
          "`withModal` does the wiring for you.",
          "",
          "Each story below opens with `defaultOpen` and keeps its trigger button behind the backdrop,",
          "so the modal can be closed and reopened while you read.",
        ].join("\n"),
      },
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
  // Every story renders the modal open with `defaultOpen`: a story is first a
  // picture of the pattern. Its trigger is what makes the picture recoverable.
  args: { defaultOpen: true, children: null },
  argTypes: {
    // The stories compose their sections in a custom render, never from args.
    children: { control: false },
    // `defaultOpen` is read once, on mount: a live control over it would do
    // nothing, because the story re-renders rather than remounting.
    defaultOpen: { control: false },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The full anatomy, composed from its sections: a header with the title and
 * the dismiss icon, the content, and two actions bounded by the horizontal
 * rules. The affirmative action is last and carries the constructive
 * anticipation, which is where the green fill comes from. Both actions close
 * the modal: closing is what an action does once its own work is done.
 */
export const Default: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
<Modal ref={modalRef}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Content>
    lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua.
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary" onClick={close}>
      Cancel
    </Button>
    <Button importance="primary" anticipation="constructive" onClick={close}>
      Confirm
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ defaultOpen }) => (
    <ModalPreview defaultOpen={defaultOpen}>
      {(close) => (
        <>
          <Modal.Header>Title</Modal.Header>
          <Modal.Content>
            lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Modal.Content>
          <Modal.Footer>
            <Button importance="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              importance="primary"
              anticipation="constructive"
              onClick={close}
            >
              Confirm
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalPreview>
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
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
<Modal ref={modalRef}>
  <Modal.Header>Delete instance</Modal.Header>
  <Modal.Content>
    Deleting this instance removes its volumes and snapshots. This cannot be
    undone.
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary" onClick={close}>
      Cancel
    </Button>
    <Button
      importance="primary"
      anticipation="destructive"
      onClick={() => {
        // …delete the instance, then:
        close();
      }}
    >
      Delete
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ defaultOpen }) => (
    <ModalPreview defaultOpen={defaultOpen}>
      {(close) => (
        <>
          <Modal.Header>Delete instance</Modal.Header>
          <Modal.Content>
            Deleting this instance removes its volumes and snapshots. This
            cannot be undone.
          </Modal.Content>
          <Modal.Footer>
            <Button importance="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              importance="primary"
              anticipation="destructive"
              onClick={close}
            >
              Delete
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalPreview>
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
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
<Modal ref={modalRef}>
  <Modal.Header dismissible={false}>Unsaved changes</Modal.Header>
  <Modal.Content>
    You have unsaved changes that will be lost if you continue.
  </Modal.Content>
  <Modal.Footer>
    <Button importance="secondary" onClick={close}>
      Keep editing
    </Button>
    <Button importance="primary" anticipation="destructive" onClick={close}>
      Discard
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ defaultOpen }) => (
    <ModalPreview defaultOpen={defaultOpen}>
      {(close) => (
        <>
          <Modal.Header dismissible={false}>Unsaved changes</Modal.Header>
          <Modal.Content>
            You have unsaved changes that will be lost if you continue.
          </Modal.Content>
          <Modal.Footer>
            <Button importance="secondary" onClick={close}>
              Keep editing
            </Button>
            <Button
              importance="primary"
              anticipation="destructive"
              onClick={close}
            >
              Discard
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalPreview>
  ),
};

/**
 * Supplementary context with nothing to decide, so the footer is simply not
 * composed. The dismiss icon, Escape and — because this one opts in — a
 * backdrop click are the ways out.
 */
export const WithoutActions: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);

<Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
<Modal ref={modalRef} closeOnBackdropClick>
  <Modal.Header>Search syntax</Modal.Header>
  <Modal.Content>
    Combine terms with AND, OR and NOT. Quote a phrase to match it exactly.
  </Modal.Content>
</Modal>`,
      },
    },
  },
  render: ({ defaultOpen }) => (
    <ModalPreview defaultOpen={defaultOpen} closeOnBackdropClick>
      {() => (
        <>
          <Modal.Header>Search syntax</Modal.Header>
          <Modal.Content>
            Combine terms with AND, OR and NOT. Quote a phrase to match it
            exactly.
          </Modal.Content>
        </>
      )}
    </ModalPreview>
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
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
<Modal ref={modalRef}>
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
    <Button importance="secondary" onClick={close}>
      Cancel
    </Button>
    <Button importance="primary" anticipation="constructive" onClick={close}>
      Connect
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ defaultOpen }) => (
    <ModalPreview defaultOpen={defaultOpen}>
      {(close) => (
        <>
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
                <KeyboardKey keyValue="cmd" /> <KeyboardKey keyValue="c" /> to
                copy the command below.
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
            <Button importance="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              importance="primary"
              anticipation="constructive"
              onClick={close}
            >
              Connect
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalPreview>
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
        code: `const modalRef = useRef<HTMLDialogElement>(null);

<Button onClick={() => modalRef.current?.showModal()}>Open modal</Button>
<Modal ref={modalRef}>
  <Modal.Header>Terms</Modal.Header>
  <Modal.Content>
    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
  </Modal.Content>
  <Modal.Footer>
    <Button
      importance="primary"
      anticipation="constructive"
      onClick={() => modalRef.current?.close()}
    >
      Accept
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: ({ defaultOpen }) => (
    <ModalPreview defaultOpen={defaultOpen}>
      {(close) => (
        <>
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
            <Button
              importance="primary"
              anticipation="constructive"
              onClick={close}
            >
              Accept
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalPreview>
  ),
};
