import type { Decorator, Meta, StoryFn } from "@storybook/react-vite";

import {
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WindowFitmentSide } from "../../hooks/index.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import type { WithTooltipOptions } from "./index.js";
import { withTooltip } from "./index.js";

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
 * decorator provides it from Storybook's `viewMode`; the `Demo` helper uses it
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

interface DemoProps<TProps extends object> {
  /** The component type to wrap with a tooltip (the trigger). */
  trigger: ComponentType<TProps>;
  /** The tooltip content. */
  Message: ReactNode;
  /** Props forwarded to the trigger component. */
  triggerProps?: TProps;
  /** Tooltip options — everything except `open`, which `Demo` resolves. */
  options?: Omit<WithTooltipOptions, "open">;
  /**
   * Force the tooltip open/closed. When omitted, it force-opens in the isolated
   * story view and stays hover-driven (uncontrolled) on the docs page.
   */
  open?: boolean;
}

/**
 * Builds a `withTooltip`-wrapped trigger and renders it, force-opening in the
 * isolated story view and staying hover-driven (uncontrolled) on the docs page.
 * `withTooltip` bakes its options in at wrap time, so `Demo` recreates the
 * wrapped component whenever the trigger, message, or resolved options change.
 * For a hover-only story, pass `open={false}` — that LOCKS it closed
 * (controlled) and disables hover; an explicit boolean `open` always wins over
 * the view-mode default.
 */
function Demo<TProps extends object>({
  trigger,
  Message,
  triggerProps,
  options,
  open,
}: DemoProps<TProps>) {
  const inStoryView = useInStoryView();
  // In docs, `open` stays undefined → uncontrolled → hover works, no stacking.
  const resolvedOpen = open ?? (inStoryView ? true : undefined);
  const Tooltipped = useMemo(
    () => withTooltip(trigger, Message, { ...options, open: resolvedOpen }),
    [trigger, Message, options, resolvedOpen],
  );
  return <Tooltipped {...(triggerProps as TProps)} />;
}

const meta = {
  title: "components/Tooltip/withTooltip",
  // `trackViewMode` provides the docs/story flag; `stage` wraps the story.
  decorators: [stage, trackViewMode],
  parameters: {
    layout: "centered",
  },
  globals: {
    backgrounds: {
      value: "dark",
    },
  },
  // No `autodocs` tag: the docs page is supplied by withTooltip.mdx
  // (`<Meta of={Stories} />`). Having both creates two docs pages for the same
  // component, which Storybook refuses to index.
} satisfies Meta;

export default meta;

/**
 * The minimal HOC form: wrap a component with a message, use it like the
 * component you wrapped. Hover the button to reveal the tooltip.
 */
export const Default: StoryFn = () => {
  const TooltippedButton = withTooltip(Button, <span>Tooltip content</span>);

  return <TooltippedButton {...anchorButtonProps}>Hover me</TooltippedButton>;
};
Default.storyName = "Default";

/**
 * A tooltip can carry a leading icon (Figma: 16px glyph, dimension-100 gap,
 * always before the text). The icon is decorative — the message carries the
 * meaning.
 */
export const WithIcon: StoryFn = () => (
  <Demo
    trigger={Button}
    triggerProps={{ ...anchorButtonProps, children: "Icon tooltip" }}
    Message="The standard tooltip explains an icon or control."
    options={{
      icon: <Icon icon="information" />,
      preferredDirections: ["block-start"],
    }}
  />
);

/**
 * Long messages wrap at the tooltip's max-width (Figma: 284px). Explicit
 * newlines in the message are still honoured.
 */
export const Multiline: StoryFn = () => (
  <Demo
    trigger={Button}
    triggerProps={{ ...anchorButtonProps, children: "Long tooltip" }}
    Message="The standard tooltip explains an icon or control, or adds a short clarification that runs across several lines when the content is long."
    options={{
      icon: <Icon icon="information" />,
      preferredDirections: ["block-start"],
    }}
  />
);

/**
 * The tooltip's max-width is a token (--tooltip-max-width, Figma 284px). This
 * story exposes it as a control so the wrapping width can be tested. The value
 * is applied to the message element via `messageElementStyle`.
 */
export const MaxWidth: StoryFn<{ maxWidth: number }> = ({ maxWidth }) => (
  <Demo
    trigger={Button}
    triggerProps={{
      ...anchorButtonProps,
      children: `Max width: ${maxWidth}px`,
    }}
    Message="The standard tooltip explains an icon or control, or adds a short clarification that wraps at the configured maximum width."
    options={{
      preferredDirections: ["block-start"],
      messageElementStyle: { maxWidth },
    }}
  />
);
MaxWidth.args = { maxWidth: 284 };
MaxWidth.argTypes = {
  maxWidth: { control: { type: "range", min: 120, max: 480, step: 4 } },
};

/**
 * The tooltip can be aligned along a side, not only centred — the same logical
 * `align` axis the contextual menu uses. Here it opens to the reading-flow side
 * (`inline-end`), **top-aligned** to the anchor (`align: "start"`), so the
 * tooltip's top edge lines up with the button's top rather than centring on it.
 */
export const LateralTopAligned: StoryFn = () => (
  <Demo
    trigger={Button}
    triggerProps={{ ...anchorButtonProps, children: "Side, top-aligned" }}
    Message="Aligned to the top of the anchor, on its trailing side."
    options={{
      preferredDirections: [{ side: "inline-end", align: "start" }],
    }}
  />
);

/**
 * Auto-fit, shown by a 3×3 grid of the **same** wrapped component. Every cell
 * prefers to open its tooltip to the bottom-right; the cells with room do
 * exactly that, but cells near an edge auto-flip to the opposite side. All
 * closed by default — hover a button to open its tooltip and see where it lands.
 * Same component, same props; only the available space differs.
 */
export const AutoFit: StoryFn = () => {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  // Prefer right, then bottom, but allow flipping to the opposite side
  // (left/top) so a cell with no room on the right actually flips rather
  // than clamping against the edge.
  const AutoFitButton = withTooltip(
    Button,
    "The standard tooltip explains an icon or control, or adds a longer clarification that runs across several lines and is wide enough that a cell near the right edge — like the ninth — has no room on its preferred side and flips to the opposite one.",
    {
      preferredDirections: [
        "inline-end",
        "block-end",
        "inline-start",
        "block-start",
      ],
      autoFit: true,
      icon: <Icon icon="information" />,
    },
  );
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
        <AutoFitButton key={i} {...primaryButtonProps}>
          {i + 1}
        </AutoFitButton>
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

  const DraggableButton = (props: {
    style?: React.CSSProperties;
    onPointerDown?: React.PointerEventHandler;
  }) => (
    <Button
      {...anchorButtonProps}
      // A grab cursor signals the button is draggable (grabbing while it is
      // being dragged); dragging updates the anchor position live. A fixed
      // width keeps the anchor from reflowing as it moves.
      style={props.style}
      icon="drag"
      onPointerDown={props.onPointerDown}
    >
      Move me
    </Button>
  );

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
          trigger={DraggableButton}
          triggerProps={{
            style: {
              cursor: dragging ? "grabbing" : "grab",
              inlineSize: "9rem",
              justifyContent: "center",
            },
            onPointerDown: (e: React.PointerEvent) => {
              setDragging(true);
              e.currentTarget.setPointerCapture?.(e.pointerId);
            },
          }}
          Message="I stay on screen and my arrow stays pinned to the anchor."
          options={{
            // All four sides, so auto-fit can flip to whichever fits — prefer
            // top, then bottom, then the sides — not just clamp a single
            // direction.
            preferredDirections: [
              "block-start",
              "block-end",
              "inline-end",
              "inline-start",
            ],
            autoFit: true,
          }}
        />
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

const changeableOptions: WindowFitmentSide[] = [
  "block-start",
  "inline-end",
  "block-end",
  "inline-start",
];

/**
 * The `Message` and `preferredDirections` are baked in when `withTooltip` is
 * called, so changing direction means recreating the wrapped component — the
 * HOC's identity carries the options. Click the button to cycle the side.
 */
export const Changeable: StoryFn = () => {
  const [index, setIndex] = useState(0);
  const preferredDirection =
    changeableOptions[index % changeableOptions.length];

  const ChangeableButton = useMemo(
    () =>
      withTooltip(Button, preferredDirection, {
        preferredDirections: [preferredDirection],
      }),
    [preferredDirection],
  );

  return (
    <ChangeableButton
      {...primaryButtonProps}
      onClick={() => setIndex((prev) => prev + 1)}
    >
      Click to change direction
    </ChangeableButton>
  );
};

/**
 * The four placements at once: a 2×2 matrix of the same trigger, each button
 * with a manually-configured side. Top-left points up, top-right points right,
 * bottom-left points left, bottom-right points down — so every tooltip opens
 * into the canvas and none is clipped.
 */
export const Placements: StoryFn = () => {
  const quadrants: { side: WindowFitmentSide; label: string }[] = [
    { side: "block-start", label: "Above" },
    { side: "inline-end", label: "Inline end" },
    { side: "inline-start", label: "Inline start" },
    { side: "block-end", label: "Below" },
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
      {quadrants.map(({ side, label }) => (
        <Demo
          key={side}
          trigger={Button}
          triggerProps={{ ...primaryButtonProps, children: label }}
          Message={`Opens ${label.toLowerCase()}`}
          options={{ preferredDirections: [side] }}
        />
      ))}
    </div>
  );
};

/**
 * A tooltip on an inline element inside a paragraph — the wrapper span sits in
 * the text flow and the tooltip anchors to it.
 */
export const Inline: StoryFn = () => {
  const TooltippedWord = withTooltip(
    // biome-ignore lint/a11y/useValidAnchor: Allow invalid link href for showing a link in the story
    () => <a href={"#"}>word</a>,
    "This is a tooltip describing the word",
  );
  return (
    <p>
      I am a paragraph using a&nbsp;
      <TooltippedWord />
      &nbsp;that needs further explanation, which will be provided via a
      tooltip.
    </p>
  );
};
