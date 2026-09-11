import type { ContextualMenuProps } from "@canonical/react-ds-global";
import type { ComponentProps, ReactNode } from "react";

/** A single entry in the context switcher's list — user-generated (the 24.04 spec §4.5). */
export interface ContextSwitcherItem {
  /** Stable identity for the context (list key and selection matching). */
  key: string;
  /** Display name — also shown in the dropdown field when current. */
  name: string;
  /**
   * Optional route for the context. No render target for a
   * `LinkComponent` exists inside a `role="menu"` (every row is a
   * `<div role="menuitem">`), so when given the url rides through
   * `onContextChange` and the consumer routes with their own router.
   * Omitted, the context stays a pure action.
   */
  url?: string;
  /** Optional supporting text shown under the name in the list. */
  description?: string;
  /** Optional badge for dynamic/actionable information (the 24.04 spec §4.3, Context switcher item). */
  badge?: ReactNode;
}

type OwnProps = Pick<
  ContextualMenuProps,
  | "open"
  | "onOpenChange"
  | "preferredDirections"
  | "distance"
  | "gutter"
  | "maxWidth"
  | "autoFit"
> & {
  /**
   * A caption rendered above the dropdown field (e.g. "Context") via
   * `SideNavigation.GroupHeader` — intrinsic to the component in the Figma
   * source, not a consumer composition. Omitted renders no caption.
   */
  title?: ReactNode;
  /** The currently selected context, shown in the dropdown field. */
  currentContext: ContextSwitcherItem;
  /** The user-generated list of available contexts. */
  contexts: ContextSwitcherItem[];
  /** Called when the user selects a different context from the list. */
  onContextChange?: (context: ContextSwitcherItem) => void;
  /** Called when the "create context" action is activated. Omit to hide it. */
  onCreateContext?: () => void;
  /** Label for the "create context" action. Defaults to `"Create context"`. */
  createContextLabel?: ReactNode;
};

/**
 * Renders via `ContextualMenu` — a real `<button>` trigger with
 * `aria-haspopup="menu"`/`aria-expanded`, and a `role="menu"` popup with
 * full roving-focus keyboard navigation — a "select"-like widget, not a
 * bare disclosure (the 24.04 spec §9.21). Extends `<div>`
 * (`ContextualMenu`'s own root). `onSelect` — a native `<div>` text-
 * selection event — is excluded: it would collide with this component's
 * own item-selection callback (`onContextChange`) under one name with two
 * incompatible signatures.
 */
export type ContextSwitcherProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps | "onSelect">;
