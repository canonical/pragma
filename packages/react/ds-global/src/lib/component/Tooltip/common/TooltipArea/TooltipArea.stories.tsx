import type { Decorator, Meta, StoryFn, StoryObj } from "@storybook/react-vite";

import { createContext, useContext, useRef, useState } from "react";
import { Button } from "#lib/component/Button/index.js";
import { Icon } from "#lib/component/Icon/index.js";
import type { WindowFitmentDirection } from "#lib/hooks/index.js";
import Component from "./TooltipArea.js";
import type { TooltipAreaProps } from "./types.js";

/**
 * Most story anchors use a plain tertiary button so the stories focus on tooltip
 * behaviour, not button variety. The placement demos use a primary constructive
 * button so the anchors read as clear, prominent targets.
 */
const anchorButtonProps = { importance: "tertiary" } as const;
const primaryButtonProps = {
  importance: "primary",
  anticipation: "constructive",
} as const;

/**
 * The tooltip is `position: fixed`, so it does not contribute to the story's
 * flow height — without this the Storybook (docs) Canvas collapses to just the
 * anchor button and the tooltip renders in a cramped or clipped frame. This
 * meta-level decorator reserves a tall, centred stage AND makes it a real
 * surface: the `.surface` class defines the `--surface-color-*` channels and the
 * div paints itself with them (surfaces consume themselves), so the tooltip's
 * `.contrasted` message inverts against a genuine surface, as it would in an app.
 */
const stage: Decorator = (Story) => (
  <div
    className="surface"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      // Fill the canvas (100% on a full-page docs/story canvas) but keep a
      // narrower floor so a cramped canvas still reserves room for the overlay.
      inlineSize: "100%",
      blockSize: "100%",
      minInlineSize: "min(88vw, 480px)",
      minBlockSize: "440px",
      background: "var(--surface-color-background)",
      color: "var(--surface-color-text)",
    }}
  >
    <Story />
  </div>
);

/**
 * Tooltips are `position: fixed` and portalled to the body, so on the long
 * autodocs page (many previews stacked vertically) every open-by-default tooltip
 * would pile up at the same viewport coordinates. `InStoryViewContext` carries
 * whether the current render is the isolated story view or the docs page. A
 * decorator provides it from Storybook's `viewMode`; the `Demo` wrapper uses it
 * to force-open ONLY in the isolated view — in docs it leaves the tooltip
 * uncontrolled (undefined), so it stays closed but still opens on hover.
 */
const InStoryViewContext = createContext(true);
const useInStoryView = () => useContext(InStoryViewContext);

const trackViewMode: Decorator = (Story, context) => (
  <InStoryViewContext.Provider value={context.viewMode !== "docs"}>
    <Story />
  </InStoryViewContext.Provider>
);

/**
 * A TooltipArea that force-opens in the isolated story view and stays
 * hover-driven (uncontrolled) on the docs page. For a hover-only story, render
 * `<Component>` directly (no `open` → uncontrolled); passing `open={false}` here
 * would LOCK it closed (controlled) and disable hover. An explicit boolean
 * `open` always wins over the view-mode default.
 */
const Demo = ({ open, ...props }: TooltipAreaProps) => {
  const inStoryView = useInStoryView();
  // In docs, `open` stays undefined → uncontrolled → hover works, no stacking.
  const resolvedOpen = open ?? (inStoryView ? true : undefined);
  return <Component open={resolvedOpen} {...props} />;
};

const meta = {
  title: "_work_in_progress/component/Tooltip/TooltipArea",
  component: Component,
  render: (args) => <Demo {...args} />,
  // `trackViewMode` provides the docs/story flag; `stage` wraps the story.
  decorators: [stage, trackViewMode],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    Message: "Hello world",
    children: <Button {...anchorButtonProps}>Default</Button>,
  },
};

/**
 * A tooltip can carry a leading icon (Figma: 16px glyph, dimension-100 gap,
 * always before the text). The icon is decorative — the message carries the
 * meaning.
 */
export const WithIcon: Story = {
  args: {
    icon: <Icon icon="information" />,
    Message: "The standard tooltip explains an icon or control.",
    preferredDirections: ["top"],
    children: <Button {...anchorButtonProps}>Icon tooltip</Button>,
  },
};

/**
 * Long messages wrap at the tooltip's max-width (Figma: 284px). Explicit
 * newlines in the message are still honoured.
 */
export const Multiline: Story = {
  args: {
    icon: <Icon icon="information" />,
    Message:
      "The standard tooltip explains an icon or control, or adds a short clarification that runs across several lines when the content is long.",
    preferredDirections: ["top"],
    children: <Button {...anchorButtonProps}>Long tooltip</Button>,
  },
};

/**
 * The tooltip's max-width is a token (--tooltip-max-width, Figma 284px). This
 * story exposes it as a control so the wrapping width can be tested. The value
 * is applied to the message element via `messageElementStyle`.
 */
export const MaxWidth: StoryFn<{ maxWidth: number }> = ({ maxWidth }) => (
  <Demo
    Message="The standard tooltip explains an icon or control, or adds a short clarification that wraps at the configured maximum width."
    preferredDirections={["top"]}
    messageElementStyle={{ maxWidth }}
  >
    <Button {...anchorButtonProps}>Max width: {maxWidth}px</Button>
  </Demo>
);
MaxWidth.args = { maxWidth: 284 };
MaxWidth.argTypes = {
  maxWidth: { control: { type: "range", min: 120, max: 480, step: 4 } },
};

/**
 * Auto-fit, shown by a 3×3 grid of the **same** component. Every cell prefers to
 * open its tooltip to the bottom-right; the cells with room do exactly that, but
 * cells near an edge auto-flip to the opposite side. All closed by default —
 * hover a button to open its tooltip and see where it lands. Same component,
 * same props; only the available space differs.
 */
export const AutoFit: StoryFn = () => {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: "clamp(24px, 8vw, 96px)",
        inlineSize: "min(92vw, 760px)",
        blockSize: "min(84vh, 520px)",
        placeItems: "center",
      }}
    >
      {cells.map((i) => (
        // Uncontrolled (no `open`): closed by default, opens on hover — so the
        // grid isn't a wall of open tooltips and each can be inspected on hover.
        <Component
          key={i}
          preferredDirections={["right", "bottom"]}
          autoFit
          Message={
            "The standard tooltip explains an icon or control, or adds a short clarification that runs across several lines."
          }
          icon={<Icon icon="information" />}
        >
          <Button {...primaryButtonProps}>{i + 1}</Button>
        </Component>
      ))}
    </div>
  );
};

/**
 * A single anchor you can move — drag the button around the stage, or use the
 * X / Y controls — to watch auto-fit flip and the arrow stay pinned to the
 * anchor. Push it toward an edge and the tooltip reflows to the opposite side.
 * Rendered in its own fixed stage (opts out of the shared centred decorator so
 * the absolute positioning is authoritative).
 */
export const AutoFitPlayground: StoryFn<{ x: number; y: number }> = ({
  x,
  y,
}) => {
  // The controls seed the initial position; dragging then owns it.
  const [pos, setPos] = useState({ x, y });
  const controlKey = `${x},${y}`;
  const lastControl = useRef(controlKey);
  if (lastControl.current !== controlKey) {
    lastControl.current = controlKey;
    setPos({ x, y });
  }

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const moveTo = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    const ny = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
    setPos({ x: Math.round(nx), y: Math.round(ny) });
  };

  return (
    <div
      ref={stageRef}
      className="surface"
      style={{
        position: "relative",
        inlineSize: "min(90vw, 720px)",
        blockSize: "min(80vh, 480px)",
        background: "var(--surface-color-background)",
        color: "var(--surface-color-text)",
        outline: "1px dashed color-mix(in srgb, currentColor 25%, transparent)",
        touchAction: "none",
      }}
      onPointerMove={(e) => {
        if (dragging) moveTo(e.clientX, e.clientY);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <div
        style={{
          position: "absolute",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <Demo
          Message="I stay on screen and my arrow stays pinned to the anchor."
          // All four sides, so auto-fit can flip to whichever fits — prefer top,
          // then bottom, then the sides — not just clamp a single direction.
          preferredDirections={["top", "bottom", "right", "left"]}
          autoFit
        >
          <Button
            {...anchorButtonProps}
            // A move cursor signals the button is draggable; dragging updates
            // the anchor position live. A fixed width keeps the anchor from
            // reflowing as it moves, so the tooltip tracks a stable target.
            style={{
              cursor: "move",
              inlineSize: "9rem",
              justifyContent: "center",
            }}
            icon={<Icon icon="drag" />}
            onPointerDown={(e) => {
              setDragging(true);
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
          >
            Move me
          </Button>
        </Demo>
      </div>
    </div>
  );
};
// Opt out of the shared centred stage so the absolute positioning is authoritative.
AutoFitPlayground.decorators = [(Story) => <Story />];
AutoFitPlayground.args = { x: 50, y: 15 };
AutoFitPlayground.argTypes = {
  x: { control: { type: "range", min: 0, max: 100, step: 1 } },
  y: { control: { type: "range", min: 0, max: 100, step: 1 } },
};

const changeableOptions: WindowFitmentDirection[] = [
  "top",
  "right",
  "bottom",
  "left",
];

export const Changeable: StoryFn = () => {
  const [index, setIndex] = useState(0);
  const preferredDirection = changeableOptions[index % changeableOptions.length];

  return (
    <Component
      Message={preferredDirection}
      preferredDirections={[preferredDirection]}
    >
      <Button
        {...primaryButtonProps}
        onClick={() => setIndex((prev) => prev + 1)}
      >
        Click to change direction
      </Button>
    </Component>
  );
};

/**
 * The four placements at once: a 2×2 matrix of the same component, each button
 * with a manually-configured side. Top-left points up, top-right points right,
 * bottom-left points left, bottom-right points down — so every tooltip opens
 * into the canvas and none is clipped.
 */
export const Placements: StoryFn = () => {
  const quadrants: { direction: WindowFitmentDirection; label: string }[] = [
    { direction: "top", label: "Top" },
    { direction: "right", label: "Right" },
    { direction: "left", label: "Left" },
    { direction: "bottom", label: "Bottom" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        placeItems: "center",
        gap: "clamp(48px, 12vw, 140px)",
        inlineSize: "min(88vw, 640px)",
        blockSize: "min(72vh, 420px)",
      }}
    >
      {quadrants.map(({ direction, label }) => (
        <Demo
          key={direction}
          Message={`Opens ${direction}`}
          preferredDirections={[direction]}
        >
          <Button {...primaryButtonProps}>{label}</Button>
        </Demo>
      ))}
    </div>
  );
};

export const Inline: StoryFn = () => {
  return (
    <p>
      I am a paragraph using a&nbsp;
      <Component Message="This is a tooltip describing the word">
        {/* biome-ignore lint/a11y/useValidAnchor: Allow invalid link href for showing a link in the story */}
        <a href={"#"}>word</a>
      </Component>
      &nbsp;that needs further explanation, which will be provided via a
      tooltip.
    </p>
  );
};
