import type { ModifierFamily } from "@canonical/ds-types";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = Omit<SvelteHTMLElements["span"], "children">;

export interface BadgeProps extends BaseProps {
  /**
   * Drives the background via the criticality modifier family.
   * - `"information"`: neutral, informative
   * - `"success"`: positive status
   * - `"warning"`: cautionary status
   * - `"error"`: negative status
   */
  criticality?: ModifierFamily<"criticality">;
  value: number;
  formatter?: { format: (value: number) => string };
  capped?: boolean;
}
