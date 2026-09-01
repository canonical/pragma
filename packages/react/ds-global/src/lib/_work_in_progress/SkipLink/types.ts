import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** The contents of the skip link itself */
  children?: ReactNode;
  /**
   * ID of the main content element
   * @default "main"
   * */
  mainId?: string;
};

/**
 * Props for the SkipLink component, extending the native props of its `<a>`
 * root.
 *
 * The native `href` and `tabIndex` are deliberately excluded: the DS drives
 * both — `href` is derived from `mainId` (`#${mainId}`) so the link always
 * targets the main content element, and `tabIndex` is fixed at `0` so the skip
 * link stays reachable as the first stop in the tab order.
 */
export type SkipLinkProps = OwnProps &
  Omit<ComponentProps<"a">, keyof OwnProps | "href" | "tabIndex">;
