import type { ComponentProps } from "react";

/**
 * Props for the KeyboardKeys group. No DS-owned props — it renders a plain
 * `<kbd>` root, so it accepts every native `<kbd>` prop.
 */
export type KeyboardKeysProps = ComponentProps<"kbd">;
