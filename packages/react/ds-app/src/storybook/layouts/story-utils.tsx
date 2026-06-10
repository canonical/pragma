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

/**
 * Story-only placeholder for slot content: a rectangle with an outline,
 * labelled `slotName:\n{name}`. It carries its own `.surface`, consuming the
 * surface background channel from \@canonical/styles — nested LayoutSlots
 * step down the surface layers (layer2/layer3) automatically, so depth in
 * the layout tree is visible as depth in shade.
 */
export const LayoutSlot = ({
  name = "default",
  style,
  children,
}: LayoutSlotProps): ReactNode => (
  <div
    className="surface"
    style={{
      background: "var(--surface-color-background)",
      outline: "1px dashed currentcolor",
      outlineOffset: "-1px",
      display: "grid",
      placeItems: "center",
      minBlockSize: "var(--dimension-600, 3rem)",
      blockSize: "100%",
      boxSizing: "border-box",
      ...style,
    }}
  >
    <code style={{ whiteSpace: "pre", textAlign: "center" }}>
      {`slotName:\n${name}`}
    </code>
    {children}
  </div>
);

/**
 * A run of card-shaped LayoutSlots for filling a ContentLayout in stories.
 */
export const layoutSlotCards = (
  count: number,
  minBlockSize = "8rem",
): ReactNode[] =>
  Array.from({ length: count }, (_, i) => (
    <LayoutSlot
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
      key={`card-${i + 1}`}
      name="default"
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
