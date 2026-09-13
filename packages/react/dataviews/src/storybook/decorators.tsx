/**
 * The decorators every story of the package shares: the application scope
 * the parts assume, and the frames a layout or a panel would put them in.
 */

import type { Decorator } from "@storybook/react-vite";

/**
 * Render the story inside the `.app` scope, which the table and its bars
 * assume: primary text there takes the application sizes, and the density
 * channel its application values.
 */
export const withAppScope: Decorator = (Story) => (
  <div className="app">
    <Story />
  </div>
);

/** Render the story inside a frame of the given width, as a layout would. */
export const withFrame =
  (maxWidth: string): Decorator =>
  (Story) => (
    <div style={{ maxWidth }}>
      <Story />
    </div>
  );

/** A frame of the given height that scrolls its content, as a panel would. */
export const withScrollingFrame =
  (height: string): Decorator =>
  (Story) => (
    <div style={{ maxHeight: height, overflow: "auto" }}>
      <Story />
    </div>
  );
