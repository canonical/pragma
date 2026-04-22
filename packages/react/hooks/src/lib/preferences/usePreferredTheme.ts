import type {
  UsePreferredThemeProps,
  UsePreferredThemeResult,
} from "./types.js";
import useMediaPreference from "./useMediaPreference.js";

/**
 * Manage the user's color scheme preference (light/dark).
 *
 * Applies `.light` or `.dark` class on documentElement, which activates
 * the corresponding color-scheme and derivation variables from
 * `@canonical/design-tokens`. Persists the choice in a cookie for
 * SSR-safe first paint.
 *
 * @param props - Optional initial value and cookie name override
 * @returns Current theme, source, and set/reset functions
 */
export default function usePreferredTheme(
  props?: UsePreferredThemeProps,
): UsePreferredThemeResult {
  return useMediaPreference({
    queries: [
      { query: "(prefers-color-scheme: dark)", value: "dark" as const },
    ],
    defaultValue: "light",
    allValues: ["light", "dark"] as const,
    classMap: { light: "light", dark: "dark" },
    cookieName: props?.cookieName ?? "theme",
    initialValue: props?.initialValue,
  });
}
