import type {
  UsePreferredMotionProps,
  UsePreferredMotionResult,
} from "./types.js";
import useMediaPreference from "./useMediaPreference.js";

/**
 * Manage the user's motion preference (no-preference/reduce).
 *
 * Applies `.reduce-motion` class on documentElement when reduced motion
 * is preferred. When no preference is stored and the system has no
 * preference, no class is applied. Persists the choice in a cookie
 * for SSR-safe first paint.
 *
 * @param props - Optional initial value and cookie name override
 * @returns Current motion preference, source, and set/reset functions
 */
export default function usePreferredMotion(
  props?: UsePreferredMotionProps,
): UsePreferredMotionResult {
  return useMediaPreference({
    queries: [
      {
        query: "(prefers-reduced-motion: reduce)",
        value: "reduce" as const,
      },
    ],
    defaultValue: "no-preference",
    allValues: ["no-preference", "reduce"] as const,
    classMap: { "no-preference": null, reduce: "reduce-motion" },
    cookieName: props?.cookieName ?? "motion",
    initialValue: props?.initialValue,
  });
}
