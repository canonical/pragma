import {
  clearPreferenceCookie,
  readPreferenceCookie,
  writePreferenceCookie,
} from "@canonical/react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LOCALE,
  type Direction,
  LOCALE_COOKIE,
  type Locale,
} from "./constants.js";
import { dirForLocale, isSupportedLocale } from "./negotiateLocale.js";

/** Props for {@link usePreferredLocale}. */
export interface UsePreferredLocaleProps {
  /** Server-resolved locale for SSR hydration (from `window.__INITIAL_DATA__`). */
  initialValue?: Locale;
}

/** Result of {@link usePreferredLocale}. */
export interface UsePreferredLocaleResult {
  /** The active locale. */
  value: Locale;
  /** Writing direction for {@link value}. */
  dir: Direction;
  /** Whether the value came from an explicit choice (`stored`) or the browser (`system`). */
  source: "stored" | "system";
  /** Set an explicit locale: persists a cookie and updates `<html lang/dir>`. */
  set: (locale: Locale) => void;
  /** Clear the stored choice and follow the browser languages again. */
  reset: () => void;
}

/** Best supported match from the browser's ordered language list. */
function systemLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const languages = navigator.languages ?? [navigator.language];
  for (const tag of languages) {
    const lower = tag?.toLowerCase();
    if (isSupportedLocale(lower)) return lower;
    const base = lower?.split("-")[0];
    if (isSupportedLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

function resolveInitial(initialValue: Locale | undefined): {
  value: Locale;
  source: "stored" | "system";
} {
  const cookie = readPreferenceCookie(LOCALE_COOKIE);
  if (isSupportedLocale(cookie)) return { value: cookie, source: "stored" };
  if (initialValue) return { value: initialValue, source: "system" };
  return { value: systemLocale(), source: "system" };
}

/**
 * Manage the user's language preference.
 *
 * Resolution order: stored cookie > server-provided `initialValue` >
 * `navigator.languages` > {@link DEFAULT_LOCALE}. This mirrors
 * `usePreferredTheme` but keys off the browser's language list instead of a
 * media query. It reflects `lang` and `dir` onto `documentElement` so the live
 * document tracks changes, and persists explicit choices in a cookie so the
 * server can paint the correct `<html lang>` on first render.
 *
 * @param props - Optional server-provided initial value for SSR hydration.
 */
export default function usePreferredLocale(
  props?: UsePreferredLocaleProps,
): UsePreferredLocaleResult {
  const [{ value, source }, setState] = useState(() =>
    resolveInitial(props?.initialValue),
  );

  // Track source in a ref so the languagechange listener never goes stale.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  // Reflect the active locale onto <html> for assistive tech and CSS `:dir()`.
  useEffect(() => {
    /* v8 ignore next -- SSR guard: effects don't run during renderToString */
    if (typeof document === "undefined") return;
    document.documentElement.lang = value;
    document.documentElement.dir = dirForLocale(value);
  }, [value]);

  // Follow the browser languages while no explicit choice is stored.
  useEffect(() => {
    /* v8 ignore next -- SSR guard */
    if (typeof window === "undefined") return;
    const handleChange = () => {
      if (sourceRef.current === "system") {
        setState({ value: systemLocale(), source: "system" });
      }
    };
    window.addEventListener("languagechange", handleChange);
    return () => window.removeEventListener("languagechange", handleChange);
  }, []);

  const set = useCallback((locale: Locale) => {
    writePreferenceCookie(LOCALE_COOKIE, locale);
    setState({ value: locale, source: "stored" });
  }, []);

  const reset = useCallback(() => {
    clearPreferenceCookie(LOCALE_COOKIE);
    setState({ value: systemLocale(), source: "system" });
  }, []);

  return { value, source, dir: dirForLocale(value), set, reset };
}
