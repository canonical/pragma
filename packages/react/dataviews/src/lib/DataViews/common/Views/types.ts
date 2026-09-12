import type { ComponentProps } from "react";

type OwnProps = {
  /** The group's accessible name. Defaults to "Saved views". */
  readonly label?: string;
};

/**
 * Props of the connected views control. The root is a `div` grouping the
 * collection's saved-view controls, so it extends native div props.
 * `children` is excluded, since the control renders its own contents, and so
 * is `role`, the group role being the control's own, and so are `aria-label`
 * and `aria-labelledby`, which would override the name it takes from
 * `label`.
 */
export type DataViewsViewsProps = OwnProps &
  Omit<
    ComponentProps<"div">,
    keyof OwnProps | "children" | "role" | "aria-label" | "aria-labelledby"
  >;
