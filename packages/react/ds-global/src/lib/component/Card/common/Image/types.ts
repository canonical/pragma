import type { ComponentProps } from "react";

/**
 * Props for Card.Image. No DS-owned props — it renders a plain `<img>` root, so
 * it accepts every native `<img>` prop.
 */
export type ImageProps = ComponentProps<"img">;
