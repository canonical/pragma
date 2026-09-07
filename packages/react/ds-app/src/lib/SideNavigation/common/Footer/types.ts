import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { LinkComponentProps, NavRoot } from "../../types.js";

type OwnProps = {
  /** Root whose direct children render as groups (and separators) — see NavRoot. */
  root?: NavRoot;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
  /** Fallback content when no `root` is provided. */
  children?: ReactNode;
};

export type FooterProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
