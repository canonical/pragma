import type { ComponentProps, ComponentType } from "react";
import type { FooterRoot, LinkComponentProps } from "../../types.js";

type OwnProps = {
  /** The footer's items — the footer's only data surface. See FooterRoot. */
  root?: FooterRoot;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Live current location; resolves the active row and seeds expandables. */
  currentUrl?: string;
};

export type FooterProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
