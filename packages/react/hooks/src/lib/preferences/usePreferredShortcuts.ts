import type {
  UsePreferredShortcutsProps,
  UsePreferredShortcutsResult,
} from "./types.js";
import useMediaPreference from "./useMediaPreference.js";

/**
 * Manage the user's single-key keyboard shortcut preference (on/off).
 *
 * WCAG 2.1.4 (Character Key Shortcuts) requires that a shortcut bound to a
 * bare letter, number, punctuation or symbol key can be switched off (or
 * remapped, or limited to focus). This is the stored switch: a consumer that
 * binds a bare key reads `value` and declines to act on `"off"`.
 *
 * Unlike its siblings this preference has no media query and no CSS class:
 * no media feature expresses "may this page bind bare keys", so there is
 * nothing for the system to say, and nothing is applied on `documentElement`.
 * `source` is therefore `"stored"` only once the user has chosen.
 *
 * Persists the choice in a cookie for SSR-safe first paint.
 *
 * @param props - Optional initial value and cookie name override
 * @returns Current shortcuts preference, source, and set/reset functions
 */
export default function usePreferredShortcuts(
  props?: UsePreferredShortcutsProps,
): UsePreferredShortcutsResult {
  return useMediaPreference({
    queries: [],
    defaultValue: "on",
    allValues: ["on", "off"] as const,
    classMap: { on: null, off: null },
    cookieName: props?.cookieName ?? "shortcuts",
    initialValue: props?.initialValue,
  });
}
