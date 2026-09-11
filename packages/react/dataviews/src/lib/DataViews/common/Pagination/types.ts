import type { ComponentProps } from "react";

type OwnProps = {
  /** The navigation's accessible name. Defaults to "Pagination". */
  readonly label?: string;
  /**
   * The page sizes offered. The applied size is always among them, so the
   * control can never misreport the window it is describing.
   */
  readonly sizes?: readonly number[];
};

/**
 * Props of the connected pagination part. The root is a `nav`, so it
 * extends native nav props. `children` is excluded: the destinations are
 * derived from the window and what the source can count. So are `role`,
 * which would override the nav's `navigation` role, and `aria-label` and
 * `aria-labelledby`, which would override the name it takes from `label`.
 */
export type PaginationProps = OwnProps &
  Omit<
    ComponentProps<"nav">,
    keyof OwnProps | "children" | "role" | "aria-label" | "aria-labelledby"
  >;
