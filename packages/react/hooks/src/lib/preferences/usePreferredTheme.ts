import { useInitialData } from "../initialData/index.js";
import type {
  Theme,
  UsePreferredThemeProps,
  UsePreferredThemeResult,
} from "./types.js";
import useMediaPreference from "./useMediaPreference.js";

/**
 * Manage the user's colour-scheme preference (light or dark).
 *
 * Resolves the preference in priority order — an explicit `initialValue`, then
 * the stored `theme` cookie, then the `prefers-color-scheme` media query, then
 * the `"light"` default — and applies the matching `.light` / `.dark` class on
 * `documentElement`. That class activates the corresponding `color-scheme` and
 * derivation variables from `@canonical/design-tokens`; the choice is persisted
 * in a cookie so the next request can be rendered with the right theme from the
 * first byte.
 *
 * ## Server-side rendering
 *
 * For a flash-free, mismatch-free first paint the server and the first client
 * render must agree on the theme. The hook keeps them in lockstep through the
 * SSR payload rather than `document.cookie` (which is unavailable on the server
 * and would therefore disagree):
 *
 * 1. On the server, read the request's preferences with {@link extractPreferences}
 *    and pass them to the renderer as `initialData` (e.g. `{ theme }`).
 *    `@canonical/react-ssr` serialises this to `window.__INITIAL_DATA__`.
 * 2. Wrap the tree once — on both entrypoints — with
 *    {@link InitialDataProvider}, seeded from `initialData` on the server and
 *    from `window.__INITIAL_DATA__` on the client.
 * 3. Call `usePreferredTheme()` with no arguments. When no `initialValue` is
 *    passed it reads `theme` from {@link useInitialData}, so both renders start
 *    from the same value. Passing `initialValue` explicitly overrides this.
 *
 * The application is still responsible for applying the resolved theme class to
 * its server-rendered markup (the hook's class effect runs only after
 * hydration); reading `initialData.theme` in the server entrypoint and setting
 * it on the root element gives the correct first paint.
 *
 * @param props - Optional explicit `initialValue` (overrides the SSR payload)
 *   and `cookieName` override.
 * @returns The current theme, how it was determined (`source`), and `set` /
 *   `reset` actions.
 *
 * @example
 * ```tsx
 * // No wiring needed in the component when the tree is wrapped in
 * // InitialDataProvider — the SSR theme is read from context.
 * const { value, set, reset } = usePreferredTheme();
 * ```
 */
export default function usePreferredTheme(
  props?: UsePreferredThemeProps,
): UsePreferredThemeResult {
  const { theme } = useInitialData();
  const initialValue =
    props?.initialValue ?? (theme as Theme | undefined) ?? undefined;

  return useMediaPreference({
    queries: [
      { query: "(prefers-color-scheme: dark)", value: "dark" as const },
    ],
    defaultValue: "light",
    allValues: ["light", "dark"] as const,
    classMap: { light: "light", dark: "dark" },
    cookieName: props?.cookieName ?? "theme",
    initialValue,
  });
}
