import type { ComponentProps } from "react";

/**
 * Props for the Rule component. The rule has no DS-owned props of its own — it
 * is a styled `<hr>` — so it simply accepts every native `<hr>` prop.
 */
export type RuleProps = ComponentProps<"hr">;
