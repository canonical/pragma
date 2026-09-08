import type { Meta, StoryFn } from "@storybook/react-vite";
import type React from "react";
import { Button } from "../../component/Button/index.js";
import { withModal } from "./index.js";
import Modal from "./Modal.js";

const meta = {
  title: "patterns/Modal/withModal",
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
} satisfies Meta;

export default meta;

/**
 * The simplest form: click the button, the modal opens. Close it with Escape.
 * One content section, no header, no footer — nothing to decide. A modal
 * without a header carries its own `aria-label`.
 */
export const Default: StoryFn = () => {
  const OpenButton = withModal(
    Button,
    <Modal aria-label="Example modal">
      <Modal.Content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </Modal.Content>
    </Modal>,
  );

  return <OpenButton>Open modal</OpenButton>;
};
Default.storyName = "Default";
Default.parameters = {
  docs: {
    source: {
      code: `const OpenButton = withModal(
  Button,
  <Modal aria-label="Example modal">
    <Modal.Content>...</Modal.Content>
  </Modal>,
);

<OpenButton>Open modal</OpenButton>`,
    },
  },
};

/**
 * A footer button can only do one thing here: close the modal. Pass the
 * modal as a function to receive the `close` callback and wire it with
 * `onClick={close}`. If a button needs to do more than close — submit a form,
 * open another modal — compose `Modal` directly and drive it through its `ref`.
 */
export const FooterAction: StoryFn = () => {
  const AcknowledgeButton = withModal(Button, (close) => (
    <Modal>
      <Modal.Header>Maintenance scheduled</Modal.Header>
      <Modal.Content>
        The service will restart at 02:00 UTC to apply security updates.
      </Modal.Content>
      <Modal.Footer>
        <Button importance="primary" onClick={close}>
          Got it
        </Button>
      </Modal.Footer>
    </Modal>
  ));

  return (
    <AcknowledgeButton importance="secondary">
      Maintenance notice
    </AcknowledgeButton>
  );
};
FooterAction.parameters = {
  docs: {
    source: {
      code: `const AcknowledgeButton = withModal(
  Button,
  (close) => (
    <Modal>
      <Modal.Header>Maintenance scheduled</Modal.Header>
      <Modal.Content>...</Modal.Content>
      <Modal.Footer>
        {/* A footer button can only close the modal */}
        <Button importance="primary" onClick={close}>Got it</Button>
      </Modal.Footer>
    </Modal>
  ),
);

<AcknowledgeButton importance="secondary">Maintenance notice</AcknowledgeButton>`,
    },
  },
};

/**
 * `closeOnBackdropClick` is just a prop on the modal element the consumer
 * passes, so clicking outside the panel also closes it.
 */
export const BackdropDismissible: StoryFn = () => {
  const InfoButton = withModal(
    Button,
    <Modal closeOnBackdropClick>
      <Modal.Header>Search syntax</Modal.Header>
      <Modal.Content>
        Combine terms with AND, OR and NOT. Quote a phrase to match it exactly.
      </Modal.Content>
    </Modal>,
  );

  return <InfoButton importance="secondary">Search syntax</InfoButton>;
};
BackdropDismissible.parameters = {
  docs: {
    source: {
      code: `const InfoButton = withModal(
  Button,
  <Modal closeOnBackdropClick>
    <Modal.Header>Search syntax</Modal.Header>
    <Modal.Content>...</Modal.Content>
  </Modal>,
);

<InfoButton importance="secondary">Search syntax</InfoButton>`,
    },
  },
};

/**
 * The trigger does not have to be a `Button` — any component that accepts
 * `onClick` and forwards it to the clickable element at its root works,
 * because the HOC composes its open handler onto the trigger itself. Here a
 * styled `<div>` is that root, so the modal opens when it is clicked.
 */
export const CustomTrigger: StoryFn = () => {
  const Link = ({
    children,
    onClick,
  }: {
    children?: string;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
  }) => (
    // biome-ignore lint/a11y/noStaticElementInteractions: demo trigger only
    // biome-ignore lint/a11y/useKeyWithClickEvents: demo trigger only
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        display: "inline",
        textDecoration: "underline",
      }}
    >
      {children}
    </div>
  );
  const TermsLink = withModal(
    Link,
    <Modal>
      <Modal.Header>Terms</Modal.Header>
      <Modal.Content>
        These are the terms and conditions that apply to this service.
      </Modal.Content>
    </Modal>,
  );

  return (
    <p>
      By continuing you agree to the <TermsLink>terms and conditions</TermsLink>
      .
    </p>
  );
};
CustomTrigger.parameters = {
  docs: {
    source: {
      code: `const Link = ({ children, onClick }: {
  children?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) => (
  <div onClick={onClick} style={{ cursor: "pointer", display: "inline", textDecoration: "underline" }}>
    {children}
  </div>
);

const TermsLink = withModal(
  Link,
  <Modal>
    <Modal.Header>Terms</Modal.Header>
    <Modal.Content>...</Modal.Content>
  </Modal>,
);

<p>
  By continuing you agree to the <TermsLink>terms and conditions</TermsLink>.
</p>`,
    },
  },
};
