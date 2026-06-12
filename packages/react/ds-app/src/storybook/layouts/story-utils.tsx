import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

/**
 * Shared Storybook helpers for the layout stories (ApplicationLayout,
 * ViewLayout, ContentLayout). Story-only — this folder is excluded from the
 * package build.
 *
 * Layouts divide space and render nothing visible of their own; LayoutSlot
 * makes the division visible by filling a slot with a labelled, outlined
 * rectangle.
 */

export interface LayoutSlotProps {
  /** The slot name to display (e.g. "navigation", "default", "aside"). */
  name?: string;
  /** Inline-style overrides (e.g. a minimum size for grid cards). */
  style?: CSSProperties;
  /** Optional content rendered under the label (e.g. nested layouts). */
  children?: ReactNode;
}

/** Shared base for the placeholder rectangles: own `.surface` (consuming the
 * surface background channel from \@canonical/styles, so nesting steps down
 * the layers), an outline, no padding. */
const placeholderStyle: CSSProperties = {
  background: "var(--surface-color-background)",
  outlineOffset: "-1px",
  minBlockSize: "var(--dimension-600, 3rem)",
  blockSize: "100%",
  boxSizing: "border-box",
};

/**
 * Story-only marker for an actual slot of a layout: a rectangle with a
 * dashed outline, labelled `slotName:\n{name}` at the top-left. Marks slot
 * regions only — content placed inside a slot is mocked with MockCard, not
 * with a LayoutSlot.
 */
export const LayoutSlot = ({
  name = "default",
  style,
  children,
}: LayoutSlotProps): ReactNode => (
  <div
    className="surface"
    style={{
      ...placeholderStyle,
      outline: "1px dashed currentcolor",
      ...style,
    }}
  >
    <span style={{ whiteSpace: "pre" }}>{`slotName:\n${name}`}</span>
    {children}
  </div>
);

/**
 * Story-only example content (solid outline, unlabelled) — what a real
 * application would place IN a slot, e.g. a card on the ContentLayout grid.
 */
export const MockCard = ({
  style,
  children,
}: Pick<LayoutSlotProps, "style" | "children">): ReactNode => (
  <div
    className="surface"
    style={{
      ...placeholderStyle,
      outline: "1px solid currentcolor",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A run of MockCards for filling a ContentLayout in stories. */
export const mockCards = (count: number, minBlockSize = "8rem"): ReactNode[] =>
  Array.from({ length: count }, (_, i) => (
    <MockCard
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
      key={`card-${i + 1}`}
      style={{ minBlockSize }}
    />
  ));

/**
 * Frames a layout story: viewport height plus the base `.surface`, so the
 * surface channel tokens resolve and LayoutSlot's nested surfaces step down
 * the layers. Layouts size to their container (`block-size: 100%`), so
 * without a sized ancestor a fullscreen story would collapse — this is
 * `withBaseLayer` plus the sizing that layout stories need.
 */
export const withLayoutFrame: Decorator = (Story) => (
  <div className="surface" style={{ blockSize: "100dvh" }}>
    <Story />
  </div>
);

/** Standard decorators for layout stories. */
export const layoutDecorators: Decorator[] = [withLayoutFrame];
