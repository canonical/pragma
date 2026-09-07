import type { ContextualMenuProps } from "@canonical/react-ds-global";
import type { ComponentProps, ReactNode } from "react";

/** A single entry in the context switcher's list — user-generated (SPEC.md §4.5). */
export interface ContextSwitcherItem {
  /** Stable identity for the context (list key and selection matching). */
  key: string;
  /** Display name — also shown in the dropdown field when current. */
  name: string;
  /** Optional supporting text shown under the name in the list. */
  description?: string;
  /** Optional badge for dynamic/actionable information (SPEC.md §4.3, Context switcher item). */
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
   * A caption rendered above the dropdown field (e.g. "Context"), via
   * `SideNavigation.GroupHeader` — an intrinsic part of this component in
   * the Figma source (its own `group-heading` sub-component, node
   * `657:39353`'s "Title and input wrapper"), not something a consumer
   * composes separately above it. Omitted renders no caption.
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
 * full roving-focus keyboard navigation (arrow keys, Home/End, type-ahead)
 * — a "select"-like widget, not a bare disclosure (SPEC.md §9.21). Extends
 * `<div>` (`ContextualMenu`'s own root), not `<details>` — this stopped
 * being a `Popover` in that pass. `onSelect` is a native `<div>` text-
 * selection event unrelated to this component's own item-selection
 * callback (`onContextChange`) — explicitly excluded, or the two would
 * collide under one name with two incompatible signatures.
 */
export type ContextSwitcherProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps | "onSelect">;
