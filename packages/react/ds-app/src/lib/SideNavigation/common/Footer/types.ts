import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { FooterItem, LinkComponentProps, NavRoot } from "../../types.js";

type OwnProps = {
  /** Root whose direct children render as groups (and separators) — see NavRoot. */
  root?: NavRoot;
  /**
   * The footer's items, from the spec's closed vocabulary. Takes precedence
   * over `root`/`children` when given (SPEC.md §4.1, §10.6).
   */
  items?: FooterItem[];
  /**
   * When `true`, an `account` item shows the `certificate` icon instead of
   * `user`, and any `logout` item is dropped. Only affects `items`.
   */
  certificateUser?: boolean;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
  /** Fallback content when neither `items` nor `root` is provided. */
  children?: ReactNode;
};

export type FooterProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
