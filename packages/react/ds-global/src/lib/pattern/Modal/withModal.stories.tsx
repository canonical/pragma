import type { Meta, StoryFn } from "@storybook/react-vite";
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
      description: {
        component: [
          "`withModal` wraps a trigger with a modal: **click the trigger → the modal opens**.",
          "",
          "**How it closes:** the header's X button and Escape always work. A footer button can",
          "close it too — pass the content as a function to receive the `close` callback:",
          "`withModal(Button, (close) => <Modal.Footer><Button onClick={close}>Done</Button></Modal.Footer>)`.",
          "",
          "**A footer button can only close the modal.** If an action needs to do anything else —",
          "save data, open another modal, close conditionally — skip this HOC and compose `Modal`",
          "directly, driving it through its `ref`.",
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
} satisfies Meta;

export default meta;

/**
 * The simplest form: click the button, the modal opens. Close it with the
 * header's X button or Escape. No footer — nothing to decide.
 */
export const Default: StoryFn = () => {
  const OpenButton = withModal(
    Button,
    <>
      <Modal.Header>Title</Modal.Header>
      <Modal.Content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </Modal.Content>
    </>,
  );

  return <OpenButton>Open modal</OpenButton>;
};
Default.storyName = "Default";
Default.parameters = {
  docs: {
    source: {
      code: `const OpenButton = withModal(
  Button,
  <>
    <Modal.Header>Title</Modal.Header>
    <Modal.Content>...</Modal.Content>
  </>,
);

<OpenButton>Open modal</OpenButton>`,
    },
  },
};

/**
 * A footer button can only do one thing here: close the modal. Pass the
 * content as a function to receive the `close` callback and wire it with
 * `onClick={close}`. If a button needs to do more than close — submit a form,
 * open another modal — compose `Modal` directly and drive it through its `ref`.
 */
export const FooterAction: StoryFn = () => {
  const AcknowledgeButton = withModal(Button, (close) => (
    <>
      <Modal.Header>Maintenance scheduled</Modal.Header>
      <Modal.Content>
        The service will restart at 02:00 UTC to apply security updates.
      </Modal.Content>
      <Modal.Footer>
        <Button importance="primary" onClick={close}>
          Got it
        </Button>
      </Modal.Footer>
    </>
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
    <>
      <Modal.Header>Maintenance scheduled</Modal.Header>
      <Modal.Content>...</Modal.Content>
      <Modal.Footer>
        {/* A footer button can only close the modal */}
        <Button importance="primary" onClick={close}>Got it</Button>
      </Modal.Footer>
    </>
  ),
);

<AcknowledgeButton importance="secondary">Maintenance notice</AcknowledgeButton>`,
    },
  },
};

/**
 * `closeOnBackdropClick` is forwarded to the underlying `Modal` through the
 * optional third argument, so clicking outside the panel also closes it.
 */
export const BackdropDismissible: StoryFn = () => {
  const InfoButton = withModal(
    Button,
    <>
      <Modal.Header>Search syntax</Modal.Header>
      <Modal.Content>
        Combine terms with AND, OR and NOT. Quote a phrase to match it exactly.
      </Modal.Content>
    </>,
    { closeOnBackdropClick: true },
  );

  return <InfoButton importance="secondary">Search syntax</InfoButton>;
};
BackdropDismissible.parameters = {
  docs: {
    source: {
      code: `const InfoButton = withModal(
  Button,
  <>
    <Modal.Header>Search syntax</Modal.Header>
    <Modal.Content>...</Modal.Content>
  </>,
  { closeOnBackdropClick: true },
);

<InfoButton importance="secondary">Search syntax</InfoButton>`,
    },
  },
};

/**
 * The trigger does not have to be a `Button` — any component that renders a
 * clickable element works, because the open handler sits on a wrapper span and
 * catches the bubbled click.
 */
export const CustomTrigger: StoryFn = () => {
  const Link = ({ children }: { children?: string }) => (
    // biome-ignore lint/a11y/useValidAnchor: demo trigger only
    <a href="#">{children}</a>
  );
  const TermsLink = withModal(
    Link,
    <>
      <Modal.Header>Terms</Modal.Header>
      <Modal.Content>
        These are the terms and conditions that apply to this service.
      </Modal.Content>
    </>,
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
      code: `const TermsLink = withModal(
  Link,
  <>
    <Modal.Header>Terms</Modal.Header>
    <Modal.Content>...</Modal.Content>
  </>,
);

<p>
  By continuing you agree to the <TermsLink>terms and conditions</TermsLink>.
</p>`,
    },
  },
};
