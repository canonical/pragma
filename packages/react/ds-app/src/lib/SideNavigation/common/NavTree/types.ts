import type { ComponentProps, ComponentType } from "react";
import type { LinkComponentProps, NavRoot } from "../../types.js";

type OwnProps = {
  /** Root NavItem whose direct children (level-1 groups) are rendered. */
  root: NavRoot;
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
};

export type NavTreeProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
