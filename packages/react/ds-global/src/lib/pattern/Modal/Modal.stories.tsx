import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";
import { Button } from "../../component/Button/index.js";
import { Chip } from "../../component/Chip/index.js";
import { InlineCode } from "../../component/InlineCode/index.js";
import { KeyboardKey } from "../../component/KeyboardKey/index.js";
import Component from "./Provider.js";

/*
 * Every story is the consumer pattern verbatim — a ref that drives the modal,
 * sections composed as children — with one story-ism: the callback ref opens
 * the modal the moment it mounts, because a story is a static visual fixture
 * with nothing to click. In an application the open comes from an event
 * instead — `onClick={() => modalRef.current?.showModal()}` on the trigger
 * that owns the modal.
 */

const meta = {
  title: "patterns/Modal",
  component: Component,
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
  // Every story renders the modal open: a story is first a picture of the
  // pattern.
  args: {
    children: null,
    // The stories open the modal through a ref of their own in their custom
    // renders; this one only satisfies the required prop for Storybook's
    // typing and is never used.
    ref: () => {},
  },
  argTypes: {
    // The stories compose their sections in a custom render, never from args.
    children: { control: false },
    ref: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The full anatomy, composed from its sections: a header with the title and
 * the dismiss icon, the content, and two actions bounded by the horizontal
 * rules. The affirmative action is last and carries the constructive
 * anticipation, which is where the green fill comes from. Both actions close
 * the modal: closing is what an action does once its own work is done.
 */
const DefaultStory = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const close = () => modalRef.current?.close();

  return (
    <Component
      ref={(dialog: HTMLDialogElement | null) => {
        modalRef.current = dialog;
        if (dialog && !dialog.open) dialog.showModal();
      }}
    >
      <Component.Header>Ubuntu Pro</Component.Header>
      <Component.Content>
        Your Ubuntu Pro subscription covers security and compliance for the full
        stack. Renew to keep continuous CVE management and 24/7 support.
      </Component.Content>
      <Component.Footer>
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
      </Component.Footer>
    </Component>
  );
};

export const Default: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Modal
  ref={(dialog: HTMLDialogElement | null) => {
    modalRef.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  }}
>
  <Modal.Header>Ubuntu Pro</Modal.Header>
  <Modal.Content>
    Your Ubuntu Pro subscription covers security and compliance for the
    full stack. Renew to keep continuous CVE management and 24/7 support.
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
  render: () => <DefaultStory />,
};

/**
 * A destructive confirmation. The consequence is spelled out in the content
 * and the affirmative action carries the matching anticipation modifier.
 */
const DestructiveConfirmationStory = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const close = () => modalRef.current?.close();

  return (
    <Component
      ref={(dialog: HTMLDialogElement | null) => {
        modalRef.current = dialog;
        if (dialog && !dialog.open) dialog.showModal();
      }}
    >
      <Component.Header>Delete instance</Component.Header>
      <Component.Content>
        Deleting this instance removes its volumes and snapshots. This cannot be
        undone.
      </Component.Content>
      <Component.Footer>
        <Button importance="secondary" onClick={close}>
          Cancel
        </Button>
        <Button importance="primary" anticipation="destructive" onClick={close}>
          Delete
        </Button>
      </Component.Footer>
    </Component>
  );
};

export const DestructiveConfirmation: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Modal
  ref={(dialog: HTMLDialogElement | null) => {
    modalRef.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  }}
>
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
  render: () => <DestructiveConfirmationStory />,
};

/**
 * Undismissible and backdrop clicks are ignored, so the visible way out is
 * an action — Escape still closes the modal, as it always does.
 */
const UndismissibleStory = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const close = () => modalRef.current?.close();

  return (
    <Component
      ref={(dialog: HTMLDialogElement | null) => {
        modalRef.current = dialog;
        if (dialog && !dialog.open) dialog.showModal();
      }}
    >
      <Component.Header undismissible>Unsaved changes</Component.Header>
      <Component.Content>
        You have unsaved changes, which will be lost if you continue.
      </Component.Content>
      <Component.Footer>
        <Button importance="secondary" onClick={close}>
          Keep editing
        </Button>
        <Button importance="primary" anticipation="destructive" onClick={close}>
          Discard
        </Button>
      </Component.Footer>
    </Component>
  );
};

export const Undismissible: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Modal
  ref={(dialog: HTMLDialogElement | null) => {
    modalRef.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  }}
>
  <Modal.Header undismissible>Unsaved changes</Modal.Header>
  <Modal.Content>
    You have unsaved changes, which will be lost if you continue.
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
  render: () => <UndismissibleStory />,
};

/**
 * Content is an open slot, not a text field: it takes arbitrary React, so
 * other components compose inside it. Here a paragraph, a KeyboardKey
 * shortcut hint, an InlineCode command and a row of Chips share one modal.
 * Each child brings its own margins, so the slot's outermost element owns
 * the spacing rather than leaving the browser defaults to stack on top of
 * the content padding.
 */
const RichContentStory = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const close = () => modalRef.current?.close();

  return (
    <Component
      ref={(dialog: HTMLDialogElement | null) => {
        modalRef.current = dialog;
        if (dialog && !dialog.open) dialog.showModal();
      }}
    >
      <Component.Header>Connect to instance</Component.Header>
      <Component.Content>
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
      </Component.Content>
      <Component.Footer>
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
      </Component.Footer>
    </Component>
  );
};

export const RichContent: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);
const close = () => modalRef.current?.close();

<Modal
  ref={(dialog: HTMLDialogElement | null) => {
    modalRef.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  }}
>
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
  render: () => <RichContentStory />,
};

/**
 * Only the content pane scrolls: the header and footer stay in place, and the
 * dialog never grows past --modal-max-block-size.
 */
const storyOfUbuntu = [
  "Ubuntu is an ancient African word meaning 'humanity to others'. It is often described as reminding us that 'I am what I am because of who we all are'. We bring the spirit of Ubuntu to the world of computers and software.",
  "Linux was already established in 2004, but it was fragmented into proprietary and unsupported community editions, and free software was not a part of everyday life for most computer users. That's when Mark Shuttleworth gathered a small team of Debian developers who together founded Canonical and set out to create an easy-to-use Linux desktop called Ubuntu.",
  "The mission for Ubuntu is both social and economic. First, we deliver the world's free software, freely, to everybody on the same terms. Whether you are a student or a global bank, you can download and use Ubuntu free of charge.",
  "Ubuntu was the first operating system to commit to scheduled releases on a predictable cadence, every six months, starting in October 2004. In 2006 we decided that every fourth release, made every two years, would receive long-term support for large-scale deployments. This is the origin of the term LTS for stable, maintained releases.",
  "The commercial and community teams collaborate to produce a single, high-quality release, which receives ongoing maintenance for a defined period. Both the release and ongoing updates for core packages are freely available to all users.",
  "Canonical is the publisher of Ubuntu. Members of the Canonical team lead aspects of Ubuntu such as the kernel, default desktop, foundations, security, OpenStack, and Kubernetes.",
  "However, the governance of Ubuntu is somewhat independent of Canonical, with volunteer leaders from around the world taking responsibility for many critical elements of the project.",
  "It remains a key tenet of the Ubuntu Project that Ubuntu is a shared work between Canonical, other companies, and the thousands of volunteers who bring their expertise to bear on making it a world-class platform for anyone to use.",
  "The first official Ubuntu release — Version 4.10, codenamed the 'Warty Warthog' — was launched in October 2004, and sparked dramatic global interest as thousands of free software enthusiasts and experts joined the Ubuntu community.",
  "Ubuntu today has many flavors and dozens of specialized derivatives. There are also special editions for servers, OpenStack clouds, and connected devices. All editions share common infrastructure and software, making Ubuntu a unique single platform that scales from consumer electronics to the desktop and up into the cloud for enterprise computing.",
  "Ubuntu Desktop is by far the world's most widely used Linux workstation platform, powering the work of engineers across the globe. Ubuntu Core sets the standard for tiny, transactional operating systems for highly secure connected devices.",
  "We hope Ubuntu will bring something wonderful to your computing — and we hope that you'll join us in helping to shape and build the future of free software together.",
];

const LongContentStory = () => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <Component
      ref={(dialog: HTMLDialogElement | null) => {
        modalRef.current = dialog;
        if (dialog && !dialog.open) dialog.showModal();
      }}
    >
      <Component.Header>The story of Ubuntu</Component.Header>
      <Component.Content>
        {storyOfUbuntu.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </Component.Content>
      <Component.Footer>
        <Button
          importance="primary"
          anticipation="constructive"
          onClick={() => modalRef.current?.close()}
        >
          Close
        </Button>
      </Component.Footer>
    </Component>
  );
};

export const LongContent: Story = {
  parameters: {
    docs: {
      source: {
        code: `const modalRef = useRef<HTMLDialogElement>(null);

<Modal
  ref={(dialog: HTMLDialogElement | null) => {
    modalRef.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  }}
>
  <Modal.Header>The story of Ubuntu</Modal.Header>
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
      Close
    </Button>
  </Modal.Footer>
</Modal>`,
      },
    },
  },
  render: () => <LongContentStory />,
};
