import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** The group's accessible name. Defaults to "Selection actions". */
  readonly label?: string;
  /**
   * The selection indicator: the count of selected items by default. A
   * caller's own indicator — a menu opening the selection, say — replaces it;
   * `null` shows none.
   */
  readonly indicator?: ReactNode;
  /**
   * The actions that apply to the selection. Each reads the selection when it
   * is activated, through `useDataViews`, so the bar takes no second copy of
   * it.
   */
  readonly children?: ReactNode;
};

/**
 * Props of the connected action bar. The root is a `div` grouping the
 * selection's commands, so it extends native div props. `role` is excluded,
 * since the group role is the bar's own, and so are `aria-label` and
 * `aria-labelledby`, which would override the name it takes from `label`.
 * So is `ref`: the bar holds its root to hand the focus back when it leaves.
 */
export type ActionsProps = OwnProps &
  Omit<
    ComponentProps<"div">,
    keyof OwnProps | "role" | "aria-label" | "aria-labelledby" | "ref"
  >;
