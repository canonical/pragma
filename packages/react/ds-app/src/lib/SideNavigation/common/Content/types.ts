import type { Item as NavItem } from "@canonical/ds-types";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { LinkComponentProps } from "../../types.js";

type OwnProps = {
  /** Root item whose direct children are rendered as the nav item list. */
  root?: NavItem;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
  /** Fallback content when no `root` is provided. */
  children?: ReactNode;
};

export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
