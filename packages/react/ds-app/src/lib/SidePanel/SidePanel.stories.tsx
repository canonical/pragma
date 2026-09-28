import { Button, withTooltip } from "@canonical/react-ds-global";
import { Field, Form } from "@canonical/react-ds-global-form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { ubuntuStory } from "../../storybook/sidePanel/fixtures.js";
import Component from "./Provider.js";
import type { SidePanelHandle } from "./types.js";

const meta: Meta<typeof Component> = {
  title: "Components/SidePanel",
  component: Component,
  parameters: {
    docs: {
      story: {
        // Docs previews render the story in its own iframe: the panel is
        // `position: fixed; inset-block: 0`, exactly as tall as the viewport
        // it renders into — inside an iframe that viewport is the frame
        // itself, so the open panel stays contained instead of escaping over
        // the docs page.
        inline: false,
        iframeHeight: "30rem",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

/*
  Every story shows the panel exactly as a consumer writes it. The static
  fixtures carry one fixture-only twist: the callback ref opens the panel the
  moment it mounts, because a static story has nothing to click. In an
  application the open comes from an event instead —
  `onClick={() => panelRef.current?.open()}` on the trigger that owns the
  panel — which is exactly what the interactive stories wire up for real.
*/

type Instance = {
  name: string;
  status: string;
  image: string;
  type: string;
  architecture: string;
  cpu: string;
  memory: string;
  storage: string;
  ipv4: string;
  created: string;
};

const instances: Instance[] = [
  {
    name: "noble-vm-01",
    status: "Running",
    image: "Ubuntu 24.04 LTS (Noble Numbat)",
    type: "Virtual machine",
    architecture: "x86_64",
    cpu: "2 vCPUs",
    memory: "4 GiB",
    storage: "20 GiB",
    ipv4: "10.20.30.11",
    created: "2024-11-02",
  },
  {
    name: "jammy-db-01",
    status: "Running",
    image: "Ubuntu 22.04 LTS (Jammy Jellyfish)",
    type: "Container",
    architecture: "x86_64",
    cpu: "4 vCPUs",
    memory: "8 GiB",
    storage: "50 GiB",
    ipv4: "10.20.30.24",
    created: "2023-06-18",
  },
  {
    name: "focal-cache-01",
    status: "Stopped",
    image: "Ubuntu 20.04 LTS (Focal Fossa)",
    type: "Container",
    architecture: "aarch64",
    cpu: "1 vCPU",
    memory: "2 GiB",
    storage: "10 GiB",
    ipv4: "10.20.30.7",
    created: "2022-02-09",
  },
];

/**
 * A form panel — the default story for creating or editing an entity. The
 * form scrolls with the content pane while the header and actions stay pinned.
 *
 * The fields are the design system's own `Form` and `Field`. The submit button
 * sits in the footer, outside the `<form>`, so it names the form through its
 * `form` attribute.
 */
export const WithForm: Story = {
  render: () => (
    <>
      <style>
        {`
          /* Disable animations for visual testing */
          :root {
            --side-panel-transition-duration: 0ms;
          }
        `}
      </style>
      <Component
        ref={(handle: SidePanelHandle | null) => {
          handle?.open();
        }}
      >
        <Component.Header>Create instance</Component.Header>
        <Component.Content>
          <Form
            id="create-instance"
            onSubmit={() => {}}
            defaultValues={{ release: "noble" }}
          >
            <Field
              name="instance_name"
              inputType="text"
              label="Instance name"
              placeholder="noble-vm-01"
            />
            <Field
              name="release"
              inputType="select"
              label="Ubuntu release"
              options={[
                { value: "noble", label: "Ubuntu 24.04 LTS (Noble Numbat)" },
                { value: "jammy", label: "Ubuntu 22.04 LTS (Jammy Jellyfish)" },
                { value: "focal", label: "Ubuntu 20.04 LTS (Focal Fossa)" },
              ]}
            />
            <Field
              name="enable_pro"
              inputType="checkbox"
              controlLabel="Enable Ubuntu Pro"
              description="Security and compliance coverage for your instances, including extended support for the packages you care about."
            />
            <Field
              name="cloud_init"
              inputType="textarea"
              label="Cloud-init user data (optional)"
              placeholder={"#cloud-config\npackages:\n  - nginx"}
              description="Configuration to run on first boot: packages to install, users to create, commands to run."
            />
          </Form>
        </Component.Content>
        <Component.Footer>
          <Button>Cancel</Button>
          <Button
            importance="primary"
            anticipation="constructive"
            type="submit"
            form="create-instance"
          >
            Create instance
          </Button>
        </Component.Footer>
      </Component>
    </>
  ),
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  ref={(handle: SidePanelHandle | null) => {
    handle?.open();
  }}
>
  <SidePanel.Header>Create instance</SidePanel.Header>
  <SidePanel.Content>
    <Form
      id="create-instance"
      onSubmit={handleSubmit}
      defaultValues={{ release: "noble" }}
    >
      <Field name="instance_name" inputType="text" label="Instance name" />
      <Field
        name="release"
        inputType="select"
        label="Ubuntu release"
        options={[
          { value: "noble", label: "Ubuntu 24.04 LTS (Noble Numbat)" },
          { value: "jammy", label: "Ubuntu 22.04 LTS (Jammy Jellyfish)" },
          { value: "focal", label: "Ubuntu 20.04 LTS (Focal Fossa)" },
        ]}
      />
      <Field
        name="enable_pro"
        inputType="checkbox"
        controlLabel="Enable Ubuntu Pro"
      />
      <Field
        name="cloud_init"
        inputType="textarea"
        label="Cloud-init user data (optional)"
      />
    </Form>
  </SidePanel.Content>
  <SidePanel.Footer>
    <Button>Cancel</Button>
    <Button
      importance="primary"
      anticipation="constructive"
      type="submit"
      form="create-instance"
    >
      Create instance
    </Button>
  </SidePanel.Footer>
</SidePanel>
        `,
      },
    },
  },
};

/**
 * Showing details — the interactive baseline for an application displaying a
 * selected entity. The panel starts open on the first entity; selecting
 * another updates the details on the inline-end edge.
 *
 * This is the data-driven consumption pattern: compose `SidePanel` directly
 * and drive it through a stored `ref`, because the content depends on the
 * selection (`withSidePanel` is the pattern for static content). The panel's
 * native `onClose` clears the selection on every dismissal — Cancel, Escape,
 * anything — so clicking the same entity again is a fresh change and reopens
 * the panel.
 */
export const ShowingDetails: Story = {
  render: () => {
    const panelRef = useRef<SidePanelHandle | null>(null);
    const [selected, setSelected] = useState<Instance | null>(instances[0]);

    // Open only once a selection exists, so the content is committed before
    // the dialog shows — no flash of a previous selection.
    useEffect(() => {
      if (selected) {
        panelRef.current?.open();
      }
    }, [selected]);

    return (
      <>
        <style>
          {`
            /* Disable animations for visual testing */
            :root {
              --side-panel-transition-duration: 0ms;
            }
          `}
        </style>
        <ul
          style={{
            display: "grid",
            gap: "var(--dimension-200)",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {instances.map((instance) => (
            <li key={instance.name}>
              <Button onClick={() => setSelected(instance)}>
                {instance.name}
              </Button>
            </li>
          ))}
        </ul>
        <Component
          ref={panelRef}
          // Every dismissal funnels through the native `close` event; clearing
          // the selection there re-arms the trigger for the same entity.
          onClose={() => setSelected(null)}
        >
          <Component.Header>{selected?.name ?? "Preview"}</Component.Header>
          <Component.Content>
            <p>
              <strong>Status:</strong> {selected?.status}
            </p>
            <p>
              <strong>Image:</strong> {selected?.image}
            </p>
            <p>
              <strong>Type:</strong> {selected?.type}
            </p>
            <p>
              <strong>Architecture:</strong> {selected?.architecture}
            </p>
            <p>
              <strong>CPU:</strong> {selected?.cpu}
            </p>
            <p>
              <strong>Memory:</strong> {selected?.memory}
            </p>
            <p>
              <strong>Storage:</strong> {selected?.storage}
            </p>
            <p>
              <strong>IPv4:</strong> {selected?.ipv4}
            </p>
            <p>
              <strong>Created:</strong> {selected?.created}
            </p>
          </Component.Content>
        </Component>
      </>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `
const panelRef = useRef<SidePanelHandle | null>(null);
const [selected, setSelected] = useState<Instance | null>(instances[0]);

useEffect(() => {
  if (selected) panelRef.current?.open();
}, [selected]);

<>
  <ul>
    {instances.map((instance) => (
      <li key={instance.name}>
        <Button onClick={() => setSelected(instance)}>{instance.name}</Button>
      </li>
    ))}
  </ul>
  {/* Every dismissal clears the selection, so the same entity can reopen. */}
  <SidePanel ref={panelRef} onClose={() => setSelected(null)}>
    <SidePanel.Header>{selected?.name}</SidePanel.Header>
    <SidePanel.Content>…selected entity's details…</SidePanel.Content>
  </SidePanel>
</>
        `,
      },
    },
  },
};

/**
 * The panel in a right-to-left context: no prop, nothing to opt into — the
 * panel docks to the inline-end edge, which in RTL is the left. The
 * `dir="rtl"` wrapper stands in for the application's own directionality,
 * which it carries at the document level; the panel simply inherits it.
 */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <style>
        {`
          /* Disable animations for visual testing */
          :root {
            --side-panel-transition-duration: 0ms;
          }
        `}
      </style>
      <Component
        ref={(handle: SidePanelHandle | null) => {
          handle?.open();
        }}
      >
        <Component.Header>معاينة</Component.Header>
        <Component.Content>
          <p>
            <strong>الاسم:</strong> noble-vm-01
          </p>
          <p>
            <strong>الحالة:</strong> يعمل
          </p>
          <p>
            <strong>الذاكرة:</strong> 4 GiB
          </p>
          <p>
            <strong>التخزين:</strong> 20 GiB
          </p>
        </Component.Content>
        <Component.Footer>
          <Button>إلغاء</Button>
          <Button importance="primary" anticipation="constructive">
            إطلاق
          </Button>
        </Component.Footer>
      </Component>
    </div>
  ),
  parameters: {
    docs: {
      source: {
        code: `
{/* In a right-to-left application (dir="rtl" on the document) the panel
    docks to the left edge — the panel inherits the document's
    directionality; nothing to configure. */}
<SidePanel
  ref={(handle: SidePanelHandle | null) => {
    handle?.open();
  }}
>
  <SidePanel.Header>معاينة</SidePanel.Header>
  <SidePanel.Content>…</SidePanel.Content>
  <SidePanel.Footer>
    <Button>إلغاء</Button>
    <Button importance="primary" anticipation="constructive">
      إطلاق
    </Button>
  </SidePanel.Footer>
</SidePanel>
        `,
      },
    },
  },
};

/**
 * A tooltip wider than the panel, overflowing past its edge — with the panel
 * still scrolling vertically. Both at once, because the tooltip never enters
 * the panel's tree.
 *
 * `withTooltip` (ds-global) portals its message out of the flow and positions
 * it `position: fixed`; by default the portal lands on the document body —
 * outside the dialog, so the panel's scroll container has nothing of it to
 * clip, and the panel keeps its `overflow-y: auto` untouched. This is the
 * mechanism real floating UI uses — the in-flow alternative would force a
 * choice between clipping and scrolling.
 *
 * **Why the tooltip appears permanently open here — and does not in an app.**
 * In a real application the tooltip is hover- and focus-driven: it opens when
 * the user hovers (or focuses) the trigger and closes the moment they move or
 * scroll away. This story pins it open with `open: true` for one reason only:
 * it exists for a static Chromatic snapshot, and a hover-driven tooltip cannot
 * be hovered in a screenshot — the overflow/stacking behaviour it demonstrates
 * would never be captured. The pinned-open state is a snapshoting device, not
 * component behaviour; in particular, a real tooltip would close as the panel
 * scrolls, while this one stays put.
 */
export const OverflowingTooltip: Story = {
  render: () => {
    const TooltippedButton = withTooltip(
      Button,
      <span>
        A tooltip message deliberately wider than the panel, escaping past its
        inline-start edge.
      </span>,
      {
        // Pins the tooltip open for the static snapshot ONLY — see the
        // story doc above. In a real application consumers pass no `open`:
        // the tooltip opens on hover/focus and closes on scroll-away.
        open: true,
        maxWidth: "50rem",
        preferredDirections: ["inline-start"],
        // The fitment engine parses `distance` with `parseInt` — it must be
        // a px literal, not a token reference.
        distance: "8px",
        // Class-based z-index — the inline `messageElementStyle` channel
        // cannot carry it; the rule below supplies it.
        messageElementClassName: "story-side-panel-tooltip",
      },
    );

    return (
      <>
        {/* The message escapes the panel's tree, so it stacks in the page's
            context: keep it above the panel's own z-index. */}
        <style>
          {`
            .story-side-panel-tooltip {
              z-index: calc(var(--side-panel-z-index, 1000) + 1);
            }
          
            /* Disable animations for visual testing */
            :root {
              --side-panel-transition-duration: 0ms;
            }
          `}
        </style>
        <Component
          ref={(handle: SidePanelHandle | null) => {
            handle?.open();
          }}
        >
          <Component.Header>The story of Ubuntu</Component.Header>
          <Component.Content>
            <p>
              The tooltip below is wider than the panel, and the panel still
              scrolls: the tooltip is portalled out of the panel's tree, so the
              scroll container has nothing of it to clip.
            </p>
            <TooltippedButton>Anchor with a wide tooltip</TooltippedButton>
            {Array.from({ length: 24 }, (_, index) => index).map((index) => (
              <p key={index}>{ubuntuStory[index % ubuntuStory.length]}</p>
            ))}
            <p>End of the content.</p>
          </Component.Content>
          <Component.Footer>
            <Button>Cancel</Button>
            <Button importance="primary" anticipation="constructive">
              Save
            </Button>
          </Component.Footer>
        </Component>
      </>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `
import { Button, withTooltip } from "@canonical/react-ds-global";
import { Field, Form } from "@canonical/react-ds-global-form";

const TooltippedButton = withTooltip(
  Button,
  <span>A tooltip message deliberately wider than the panel itself.</span>,
  { maxWidth: "50rem", preferredDirections: ["inline-start"] },
);

<SidePanel
  ref={(handle: SidePanelHandle | null) => {
    handle?.open();
  }}
>
  <SidePanel.Header>Panel title</SidePanel.Header>
  <SidePanel.Content>
    <TooltippedButton>Anchor with a wide tooltip</TooltippedButton>
  </SidePanel.Content>
</SidePanel>
        `,
      },
    },
  },
};

/* Real copy from ubuntu.com/about, cycled as filler in the tall story. */
const ubuntuFacts = [
  "Ubuntu is an ancient African word meaning 'humanity to others'. It is often described as reminding us that 'I am what I am because of who we all are'.",
  "Canonical is the publisher of Ubuntu. Members of the Canonical team lead aspects of Ubuntu such as the kernel, default desktop, foundations, security, OpenStack, and Kubernetes.",
  "Ubuntu was the first operating system to commit to scheduled releases on a predictable cadence, every six months, starting in October 2004.",
];

/**
 * Content taller than the panel scrolls the content pane itself; the header
 * and footer stay pinned.
 */
export const TallContent: Story = {
  render: () => (
    <>
      <style>
        {`
          /* Disable animations for visual testing */
          :root {
            --side-panel-transition-duration: 0ms;
          }
        `}
      </style>
      <Component
        ref={(handle: SidePanelHandle | null) => {
          handle?.open();
        }}
      >
        <Component.Header>About Ubuntu</Component.Header>
        <Component.Content>
          {Array.from({ length: 10 }, (_, index) => index).map((index) => (
            <p key={index}>{ubuntuFacts[index % ubuntuFacts.length]}</p>
          ))}
        </Component.Content>
        <Component.Footer>
          <Button importance="primary">Done</Button>
        </Component.Footer>
      </Component>
    </>
  ),
  parameters: {
    docs: {
      source: {
        code: `<SidePanel ref={panelRef}>
  <SidePanel.Header>About Ubuntu</SidePanel.Header>
  {/* Taller than the panel: the pane scrolls, header and footer stay. */}
  <SidePanel.Content>{paragraphs}</SidePanel.Content>
  <SidePanel.Footer>
    <Button importance="primary">Done</Button>
  </SidePanel.Footer>
</SidePanel>`,
      },
    },
  },
};

/**
 * Opt-in `fill`: the pane grows to take the space the header and footer
 * leave, so a short panel pushes its footer to the bottom edge. The default
 * is the opposite — the content keeps its natural height and the footer
 * follows it, so the actions sit next to the text they refer to rather than
 * at a distance.
 */
export const FillContent: Story = {
  render: () => (
    <>
      <style>
        {`
          /* Disable animations for visual testing */
          :root {
            --side-panel-transition-duration: 0ms;
          }
        `}
      </style>
      <Component
        ref={(handle: SidePanelHandle | null) => {
          handle?.open();
        }}
      >
        <Component.Header>Ubuntu Pro subscription</Component.Header>
        <Component.Content fill>
          <p>
            A short body — with `fill`, the pane still takes all the space the
            header and footer leave, and the footer sits on the bottom edge.
          </p>
        </Component.Content>
        <Component.Footer>
          <Button importance="primary">Subscribe</Button>
        </Component.Footer>
      </Component>
    </>
  ),
  parameters: {
    docs: {
      source: {
        code: `<SidePanel ref={panelRef}>
  <SidePanel.Header>Ubuntu Pro subscription</SidePanel.Header>
  {/* fill: the pane takes the space the header and footer leave,
      so the short panel still pushes its footer to the bottom edge. */}
  <SidePanel.Content fill>
    <p>A short body.</p>
  </SidePanel.Content>
  <SidePanel.Footer>
    <Button importance="primary">Subscribe</Button>
  </SidePanel.Footer>
</SidePanel>`,
      },
    },
  },
};
