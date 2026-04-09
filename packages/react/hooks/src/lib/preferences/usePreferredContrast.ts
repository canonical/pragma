import type {
  UsePreferredContrastProps,
  UsePreferredContrastResult,
} from "./types.js";
import useMediaPreference from "./useMediaPreference.js";

/**
 * Manage the user's contrast preference (no-preference/more/less).
 *
 * Applies `.more-contrast` or `.less-contrast` class on documentElement.
 * When no preference is stored and the system has no preference, no class
 * is applied — the design tokens fall back to their default values.
 * Persists the choice in a cookie for SSR-safe first paint.
 *
 * @param props - Optional initial value and cookie name override
 * @returns Current contrast, source, and set/reset functions
 */
export default function usePreferredContrast(
  props?: UsePreferredContrastProps,
): UsePreferredContrastResult {
  return useMediaPreference({
    queries: [
      { query: "(prefers-contrast: more)", value: "more" as const },
      { query: "(prefers-contrast: less)", value: "less" as const },
    ],
    defaultValue: "no-preference",
    allValues: ["no-preference", "more", "less"] as const,
    classMap: {
      "no-preference": null,
      more: "more-contrast",
      less: "less-contrast",
    },
    cookieName: props?.cookieName ?? "contrast",
    initialValue: props?.initialValue,
  });
}
