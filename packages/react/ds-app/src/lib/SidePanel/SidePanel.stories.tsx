import { Button, withTooltip } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { SidePanelFrame } from "../../storybook/side-panel/story-utils.js";
import SidePanel from "./SidePanel.js";

const meta: Meta<typeof SidePanel> = {
  title: "Components/SidePanel",
  component: SidePanel,
};

export default meta;
type Story = StoryObj<typeof SidePanel>;

/** The body may need the frame's element itself — e.g. as a portal target. */
type ExampleBody = ReactNode | ((frameBody: HTMLElement) => ReactNode);

/**
 * The panel is rendered open and stays open: stories show it as a visual
 * fixture, so `onOpenChange` is a no-op and dismissal requests (close button,
 * Escape) simply go nowhere. A real consumer owns `open` and reacts to it.
 *
 * The panel renders inside a `SidePanelFrame`: being `position: fixed`, it is
 * exactly as tall as the viewport it renders into, and the frame gives it one
 * of a known height.
 */
const Example = ({
  body,
  footer = true,
  header = true,
  frameStyles,
}: {
  body?: ExampleBody;
  footer?: boolean;
  header?: boolean;
  frameStyles?: string;
}) => {
  return (
    <SidePanelFrame frameStyles={frameStyles}>
      {(frameBody) => (
        <SidePanel
          open={true}
          onOpenChange={() => {}}
          // Only needed for the header-less story; harmless elsewhere.
          aria-label={header ? undefined : "Panel without a header"}
        >
          {header && <SidePanel.Header>Panel title</SidePanel.Header>}
          <SidePanel.Content>
            {typeof body === "function"
              ? body(frameBody)
              : (body ?? (
                  <p>The application behind this panel is still usable.</p>
                ))}
          </SidePanel.Content>
          {footer && (
            <SidePanel.Footer>
              {/*
                Footer content is passed in by the consumer — the panel only
                lays it out. Only the confirming action is `constructive`: the
                modifier means "this creates or confirms", so a green Cancel
                would misread.
              */}
              <Button>Cancel</Button>
              <Button importance="primary" anticipation="constructive">
                Save
              </Button>
            </SidePanel.Footer>
          )}
        </SidePanel>
      )}
    </SidePanelFrame>
  );
};

/**
 * The open panel — the visual baseline.
 *
 * The rendered story keeps the panel open as a static fixture; a real consumer
 * owns the `open` state and closes it from `onOpenChange`, as the code below
 * shows.
 */
export const Open: Story = {
  render: () => <Example />,
  parameters: {
    docs: {
      source: {
        code: `
const [open, setOpen] = useState(true);

<SidePanel open={open} onOpenChange={setOpen}>
  <SidePanel.Header>Panel title</SidePanel.Header>
  <SidePanel.Content>
    <p>The application behind this panel is still usable.</p>
  </SidePanel.Content>
  <SidePanel.Footer>
    <Button onClick={() => setOpen(false)}>Cancel</Button>
    <Button
      importance="primary"
      anticipation="constructive"
      onClick={() => setOpen(false)}
    >
      Save
    </Button>
  </SidePanel.Footer>
</SidePanel>
        `,
      },
    },
  },
};

/**
 * The claim this component makes about layout: however tall the content, the
 * header and footer stay visible and only the middle scrolls.
 */
export const OverflowingContent: Story = {
  render: () => (
    <Example
      body={
        <>
          <p>Scroll this pane. The header and footer must not move.</p>
          {Array.from(
            { length: 40 },
            (_, index) => `paragraph-${index + 1}`,
          ).map((key, index) => (
            <p key={key}>
              Paragraph {index + 1} of filler content, here to make the content
              pane overflow.
            </p>
          ))}
          <p>End of the content.</p>
        </>
      }
    />
  ),
  parameters: {
    docs: {
      source: {
        code: `
const [open, setOpen] = useState(true);

<SidePanel open={open} onOpenChange={setOpen}>
  <SidePanel.Header>Panel title</SidePanel.Header>
  <SidePanel.Content>
    {/* However tall this gets, only it scrolls. */}
    {longContent}
  </SidePanel.Content>
  <SidePanel.Footer>
    <Button onClick={() => setOpen(false)}>Cancel</Button>
    <Button
      importance="primary"
      anticipation="constructive"
      onClick={() => setOpen(false)}
    >
      Save
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
 * it `position: fixed`. This story points that portal at the frame's body
 * (`parentElement`), so the message stays in the frame's document but outside
 * the dialog: invisible to the panel's scroll container, nothing clips it, and
 * the panel keeps its `overflow-y: auto` untouched. This is the mechanism real
 * floating UI uses — the in-flow alternative would force a choice between
 * clipping and scrolling.
 *
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
 *
 */
export const OverflowingTooltip: Story = {
  render: () => (
    <Example
      frameStyles={
        ".story-side-panel-tooltip { z-index: calc(var(--side-panel-z-index, 1000) + 1); }"
      }
      body={(frameBody) => {
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
            // Class-based z-index — see the story doc above for why the inline
            // `messageElementStyle` channel cannot carry it.
            messageElementClassName: "story-side-panel-tooltip",
            // Portal into the frame's document rather than the preview's: the
            // message escapes the panel's tree without leaving the frame.
            parentElement: frameBody,
          },
        );

        return (
          <>
            <p>
              The tooltip below is wider than the panel, and the panel still
              scrolls: the tooltip is portalled out of the panel's tree, so the
              scroll container has nothing of it to clip.
            </p>
            <TooltippedButton>Anchor with a wide tooltip</TooltippedButton>
            {Array.from(
              { length: 40 },
              (_, index) => `paragraph-${index + 1}`,
            ).map((key, index) => (
              <p key={key}>
                Paragraph {index + 1} of filler content, here to make the panel
                overflow vertically.
              </p>
            ))}
            <p>End of the content.</p>
          </>
        );
      }}
    />
  ),
  parameters: {
    docs: {
      source: {
        code: `
import { Button, withTooltip } from "@canonical/react-ds-global";

// No \`open\` here: in a real application the tooltip opens on hover/focus
// and closes again when the user moves or scrolls away.
const TooltippedButton = withTooltip(
  Button,
  <span>A tooltip message deliberately wider than the panel itself.</span>,
  { maxWidth: "50rem", preferredDirections: ["inline-start"] },
);

const [open, setOpen] = useState(true);

<SidePanel open={open} onOpenChange={setOpen}>
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

/**
 * Both parts are optional; the layout must not collapse without them. Note
 * that `Example` passes `aria-label` here: without a `SidePanel.Header` there
 * is no heading to name the panel, so the label is required instead.
 */
export const WithoutHeaderOrFooter: Story = {
  render: () => <Example header={false} footer={false} />,
  parameters: {
    docs: {
      source: {
        code: `
const [open, setOpen] = useState(true);

// No SidePanel.Header means no heading to name the panel,
// so it must be named with aria-label instead.
<SidePanel open={open} onOpenChange={setOpen} aria-label="Panel title">
  <SidePanel.Content>
    <p>The application behind this panel is still usable.</p>
  </SidePanel.Content>
</SidePanel>
        `,
      },
    },
  },
};
