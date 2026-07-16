import type { ComponentProps } from "react";

/**
 * Props for the Card component. The Card has no DS-owned props of its own — it
 * is a plain `<div>` surface — so it simply accepts every native `<div>` prop.
 */
export type CardProps = ComponentProps<"div">;
