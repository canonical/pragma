import type { ComponentProps, ComponentType } from "react";
import type { LinkComponentProps, NavRoot } from "../../types.js";

type OwnProps = {
  /** Root whose direct children render as groups — see NavRoot. */
  root?: NavRoot;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
};

export type ContentProps = OwnProps &
  Omit<ComponentProps<"nav">, keyof OwnProps>;
