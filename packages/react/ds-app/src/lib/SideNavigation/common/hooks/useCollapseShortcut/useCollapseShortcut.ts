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
 */
export const useCollapseShortcut = ({
  enabled = false,
  onTrigger,
}: UseCollapseShortcutProps): UseCollapseShortcutResult => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.ctrlKey === COLLAPSE_SHORTCUT.ctrlKey &&
        event.key.toLowerCase() === COLLAPSE_SHORTCUT.key
      ) {
        event.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onTrigger]);
};
