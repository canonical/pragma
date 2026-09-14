import type { ComponentProps } from "react";

type OwnProps = {
  /** The panel's accessible name. Defaults to "Sort". */
  readonly label?: string;
};

/**
 * Props of the connected sort panel. The root is a `section` named by
 * `label`, so it extends native section props. `children` is excluded, as
 * the terms are derived from the provider; so are `aria-label` and
 * `aria-labelledby`, which `label` sets, and `tabIndex`, which the panel
 * holds so it can take focus when its last term leaves.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsSortPanelProps = OwnProps &
  Omit<
    ComponentProps<"section">,
    keyof OwnProps | "children" | "aria-label" | "aria-labelledby" | "tabIndex"
  >;
