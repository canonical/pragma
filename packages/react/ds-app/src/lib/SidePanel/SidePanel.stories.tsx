import { Button, withTooltip } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
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
  Every story shows the panel exactly as a consumer writes it, with one
  fixture-only twist: the callback ref opens it the moment it mounts, because
  a story is a static visual fixture with nothing to click. In an application
  the open comes from an event instead —
  `onClick={() => panelRef.current?.open()}` on the trigger that owns the
  panel.
*/

/**
 * The open panel — the visual baseline, showing its primary use case: static
 * details of a selected entity, with the application behind it still usable.
 */
export const Open: Story = {
  render: () => (
    <Component
      ref={(handle: SidePanelHandle | null) => {
        handle?.open();
      }}
    >
      <Component.Header>Preview</Component.Header>
      <Component.Content>
        <p>
          <strong>Name:</strong> noble-vm-01
        </p>
        <p>
          <strong>Status:</strong> Running
        </p>
        <p>
          <strong>Image:</strong> Ubuntu 24.04 LTS (Noble Numbat)
        </p>
        <p>
          <strong>CPU:</strong> 2 vCPUs
        </p>
        <p>
          <strong>Memory:</strong> 4 GiB
        </p>
        <p>
          <strong>Storage:</strong> 20 GiB
        </p>
      </Component.Content>
      <Component.Footer>
        {/*
          Footer content is passed in by the consumer — the panel only
          lays it out. Only the confirming action is `constructive`: the
          modifier means "this creates or confirms", so a green Cancel
          would misread.
        */}
        <Button>Cancel</Button>
        <Button importance="primary" anticipation="constructive">
          Launch
        </Button>
      </Component.Footer>
    </Component>
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
  <SidePanel.Header>Preview</SidePanel.Header>
  <SidePanel.Content>
    <p><strong>Name:</strong> noble-vm-01</p>
    <p><strong>Status:</strong> Running</p>
    <p><strong>Image:</strong> Ubuntu 24.04 LTS (Noble Numbat)</p>
    <p><strong>CPU:</strong> 2 vCPUs</p>
    <p><strong>Memory:</strong> 4 GiB</p>
    <p><strong>Storage:</strong> 20 GiB</p>
  </SidePanel.Content>
  <SidePanel.Footer>
    <Button>Cancel</Button>
    <Button importance="primary" anticipation="constructive">
      Launch
    </Button>
  </SidePanel.Footer>
</SidePanel>
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
        A tooltip message deliberately wider than the panel itself, escaping
        past its inline-start edge.
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
          {
            ".story-side-panel-tooltip { z-index: calc(var(--side-panel-z-index, 1000) + 1); }"
          }
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
