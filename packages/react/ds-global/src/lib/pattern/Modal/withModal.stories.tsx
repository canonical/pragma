import type { Meta, StoryFn } from "@storybook/react-vite";
import type React from "react";
import { Button } from "../../component/Button/index.js";
import { withModal } from "./index.js";
import Component from "./Provider.js";
import type { WithModalRender } from "./types.js";

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

/* The docs page for these stories lives in withModal.mdx. */
export default meta;

/*
 * The modal definitions and their wrapped triggers live at module scope, not
 * in the story bodies: a `withModal` call produces a component type, and a
 * new type per render would remount the story every time it re-renders.
 * Defined once, they are also the shape consumers should copy.
 */

const MaintenanceModal: WithModalRender = ({ close, ref }) => (
  <Component ref={ref}>
    <Component.Header>Maintenance scheduled</Component.Header>
    <Component.Content>
      The service will restart at 02:00 UTC to apply security updates.
    </Component.Content>
    <Component.Footer>
      <Button importance="primary" onClick={close}>
        Got it
      </Button>
    </Component.Footer>
  </Component>
);

const AcknowledgeButton = withModal(Button, MaintenanceModal);

/**
 * The canonical form: click the button, the modal opens; a footer button can
 * only do one thing here — close the modal. The factory receives `{ close,
 * ref }`: wire `close` with `onClick={close}`, and attach `ref` to the
 * `<Modal>` so the trigger can open it. If a button needs to do more than
 * close — submit a form, open another modal — compose `Modal` directly and
 * drive it through its `ref`.
 */
export const Default: StoryFn = () => (
  <AcknowledgeButton importance="secondary">
    Maintenance notice
  </AcknowledgeButton>
);
Default.storyName = "Default";
Default.parameters = {
  docs: {
    source: {
      code: `const MaintenanceModal: WithModalRender = ({ close, ref }) => (
  <Modal ref={ref}>
    <Modal.Header>Maintenance scheduled</Modal.Header>
    <Modal.Content>...</Modal.Content>
    <Modal.Footer>
      {/* A footer button can only close the modal */}
      <Button importance="primary" onClick={close}>Got it</Button>
    </Modal.Footer>
  </Modal>
);

const AcknowledgeButton = withModal(Button, MaintenanceModal);

<AcknowledgeButton importance="secondary">Maintenance notice</AcknowledgeButton>`,
    },
  },
};

const MaasModal: WithModalRender = ({ ref }) => (
  <Component ref={ref} closeOnBackdropClick>
    <Component.Header>MAAS</Component.Header>
    <Component.Content>
      MAAS is an open source platform that provides a centralized environment
      for managing and provisioning physical servers as if they were cloud
      resources. By turning complex tasks into automated workflows, MAAS helps
      teams move faster and focus on innovation instead of infrastructure.
    </Component.Content>
  </Component>
);

const InfoButton = withModal(Button, MaasModal);

/**
 * `closeOnBackdropClick` is just a prop on the modal element the function
 * returns, so clicking outside the panel also closes it.
 */
export const BackdropDismissible: StoryFn = () => (
  <InfoButton importance="secondary">MAAS</InfoButton>
);
BackdropDismissible.parameters = {
  docs: {
    source: {
      code: `const MaasModal: WithModalRender = ({ ref }) => (
  <Modal ref={ref} closeOnBackdropClick>
    <Modal.Header>MAAS</Modal.Header>
    <Modal.Content>
      MAAS is an open source platform that provides a centralized environment
      for managing and provisioning physical servers as if they were cloud
      resources.
    </Modal.Content>
  </Modal>
);

const InfoButton = withModal(Button, MaasModal);

<InfoButton importance="secondary">MAAS</InfoButton>`,
    },
  },
};

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

const JujuModal: WithModalRender = ({ ref }) => (
  <Component ref={ref}>
    <Component.Header>Juju</Component.Header>
    <Component.Content>
      Juju is an open source orchestration engine for software operators that
      enables the deployment, integration and lifecycle management of
      applications at any scale, on any infrastructure using charms. A charm is
      an operator — business logic encapsulated in reusable software packages
      that automate every aspect of an application's life.
    </Component.Content>
  </Component>
);

const JujuLink = withModal(Link, JujuModal);

/**
 * The trigger does not have to be a `Button` — any component that accepts
 * `onClick` and forwards it to the clickable element at its root works,
 * because the HOC composes its open handler onto the trigger itself. Here a
 * styled `<div>` is that root, so the modal opens when it is clicked.
 */
export const CustomTrigger: StoryFn = () => (
  <p>
    Automate deployment, integration and lifecycle management on any
    infrastructure — see how <JujuLink>Juju</JujuLink> does it.
  </p>
);
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

const JujuModal: WithModalRender = ({ ref }) => (
  <Modal ref={ref}>
    <Modal.Header>Juju</Modal.Header>
    <Modal.Content>...</Modal.Content>
  </Modal>
);

const JujuLink = withModal(Link, JujuModal);

<p>
  Automate deployment, integration and lifecycle management on any
  infrastructure — see how <JujuLink>Juju</JujuLink> does it.
</p>`,
    },
  },
};

const ExampleModal: WithModalRender = ({ close, ref }) => (
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

const OpenButton = withModal(Button, ExampleModal);

/**
 * This story exists solely to show one rule: a modal composed without a
 * header has no title to name it, so it must carry its own `aria-label`.
 * Without a header there is also no close button, so the footer's action is
 * the visible way out.
 */
export const WithoutHeader: StoryFn = () => <OpenButton>Open modal</OpenButton>;
WithoutHeader.storyName = "Without a header";
WithoutHeader.parameters = {
  docs: {
    source: {
      code: `const ExampleModal: WithModalRender = ({ close, ref }) => (
  <Modal ref={ref} aria-label="Ubuntu mission">
    <Modal.Content>
      We deliver the world's free software, freely, to everybody on the same
      terms. Whether you are a student or a global bank, you can
      download and use Ubuntu free of charge.
    </Modal.Content>
    <Modal.Footer>
      {/* With no header there is no close button — the footer is the way out */}
      <Button importance="primary" onClick={close}>Got it</Button>
    </Modal.Footer>
  </Modal>
);

const OpenButton = withModal(Button, ExampleModal);

<OpenButton>Open modal</OpenButton>`,
    },
  },
};
