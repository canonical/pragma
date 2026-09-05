import type { PopoverProps } from "@canonical/react-ds-global";
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
  PopoverProps,
  | "open"
  | "onOpenChange"
  | "preferredDirections"
  | "distance"
  | "gutter"
  | "maxWidth"
  | "autoFit"
  | "closeOnEscape"
  | "closeOnOutsideClick"
> & {
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
 * Renders via Popover, whose own root is a `<details>` — extending its
 * native props (rather than `<div>`) matches what this component actually
 * becomes once rendered.
 */
export type ContextSwitcherProps = OwnProps &
  Omit<ComponentProps<"details">, keyof OwnProps | "onToggle">;
