import { useEffect } from "react";
import type {
  UseCollapseShortcutProps,
  UseCollapseShortcutResult,
} from "./types.js";

/**
 * The reserved rail-collapse shortcut. Ctrl+E, per the spec's prose — kept as
 * a single named constant so the key can change in one place if/when design
 * rules between it and the single-letter alternative the same prose argues
 * for (SPEC.md §5, §10.1).
 */
export const COLLAPSE_SHORTCUT = { key: ".", ctrlKey: true } as const;

/**
 * Reserved: binds `COLLAPSE_SHORTCUT` to `onTrigger` while `enabled`.
 * `SideNavigation` calls this with `enabled: keyboardShortcut`, which
 * defaults to `false` — no listener is ever attached, and the shortcut is
 * inert, until a consumer opts in (and design ratifies the key).
 */
export const useCollapseShortcut = ({
  enabled = true,
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
