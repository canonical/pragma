import { useEffect } from "react";
import type {
  UseCollapseShortcutProps,
  UseCollapseShortcutResult,
} from "./types.js";

/**
 * The reserved rail-collapse shortcut: Ctrl+B. Kept as a single named
 * constant so the key can change in one place if/when a consumer needs a
 * different binding.
 */
export const COLLAPSE_SHORTCUT = { key: "b", ctrlKey: true } as const;

/**
 * Reserved: binds `COLLAPSE_SHORTCUT` to `onTrigger` while `enabled`.
 * `SideNavigation` calls this with `enabled: keyboardShortcut`, which
 * defaults to `false` — the shortcut is **pending approval**, so no
 * listener is ever attached and it stays inert until a consumer opts in.
 *
 * The match is exact: the Ctrl+B chord with no other modifiers held, and
 * only when the event's target is not an editable element (an input,
 * textarea, select, or contenteditable host) — Ctrl+B is bold in editors,
 * and the shortcut must never steal it.
 */
export const useCollapseShortcut = ({
  enabled = false,
  onTrigger,
}: UseCollapseShortcutProps): UseCollapseShortcutResult => {
  useEffect(() => {
    if (!enabled) return;

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      // Selector-based (not `target.isContentEditable`) so jsdom, which does
      // not implement that property, resolves the same answer in tests.
      return (
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        ) !== null
      );
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.ctrlKey === COLLAPSE_SHORTCUT.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        event.key.toLowerCase() === COLLAPSE_SHORTCUT.key &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onTrigger]);
};
