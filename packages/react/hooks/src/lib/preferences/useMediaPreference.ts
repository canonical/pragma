import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearPreferenceCookie,
  readPreferenceCookie,
  writePreferenceCookie,
} from "./cookie.js";
import type {
  PreferenceSource,
  UseMediaPreferenceProps,
  UseMediaPreferenceResult,
} from "./types.js";

/**
 * Generic hook for managing a user preference backed by cookies and CSS media queries.
 *
 * Resolves preference in priority order: stored cookie > matching media query > fallback.
 * Applies CSS classes on documentElement per the classMap config. Listens for system
 * preference changes via matchMedia. SSR-safe: accepts an initialValue for hydration
 * and warns in dev mode if the cookie and rendered value disagree.
 *
 * @param config - Media queries, values, class mapping, and cookie configuration
 * @returns Current value, source, and set/reset functions
 */
export default function useMediaPreference<T extends string>(
  config: UseMediaPreferenceProps<T>,
): UseMediaPreferenceResult<T> {
  const {
    queries,
    defaultValue,
    allValues,
    classMap,
    cookieName,
    initialValue,
  } = config;

  const [value, setValue] = useState<T>(() =>
    resolveInitialValue(
      initialValue,
      cookieName,
      allValues,
      queries,
      defaultValue,
    ),
  );

  const [source, setSource] = useState<PreferenceSource>(() =>
    resolveInitialSource(initialValue, cookieName, allValues),
  );

  const [hydrationCookieValue] = useState<string | null>(() =>
    readPreferenceCookie(cookieName),
  );

  // Track source and system value in refs so listeners don't go stale
  const sourceRef = useRef<PreferenceSource>(source);
  sourceRef.current = source;

  const systemValueRef = useRef<T>(defaultValue);

  // Cookie write on value/source change
  useEffect(() => {
    if (source === "stored") {
      writePreferenceCookie(cookieName, value);
    }
  }, [value, source, cookieName]);

  // DOM class application
  useEffect(() => {
    /* v8 ignore next -- SSR guard: effects don't run in renderToString, untestable in jsdom */
    if (typeof document === "undefined") return;
    const { documentElement } = document;

    // Remove all classes from this preference's classMap
    for (const v of allValues) {
      const cls = classMap[v];
      if (cls) documentElement.classList.remove(cls);
    }

    // Apply the current class (null = follow system, no class)
    const cls = classMap[value];
    if (cls) documentElement.classList.add(cls);

    return () => {
      if (cls) documentElement.classList.remove(cls);
    };
  }, [value, allValues, classMap]);

  // Media query listeners
  useEffect(() => {
    /* v8 ignore next -- SSR guard: effects don't run in renderToString, untestable in jsdom */
    if (typeof window === "undefined") return;

    const mediaQueries = queries.map((q) => ({
      mql: window.matchMedia(q.query),
      value: q.value,
    }));

    const computeSystemValue = (): T => {
      for (const { mql, value: v } of mediaQueries) {
        if (mql.matches) return v;
      }
      return defaultValue;
    };

    // Initialize system ref
    systemValueRef.current = computeSystemValue();

    const handleChange = () => {
      // Re-query matchMedia to get fresh matches values
      const systemValue = computeSystemValue();
      systemValueRef.current = systemValue;
      // Read source from ref to avoid stale closure
      if (sourceRef.current === "system") {
        setValue(systemValue);
      }
    };

    for (const { mql } of mediaQueries) {
      mql.addEventListener("change", handleChange);
    }

    return () => {
      for (const { mql } of mediaQueries) {
        mql.removeEventListener("change", handleChange);
      }
    };
  }, [queries, defaultValue]);

  // Dev-mode hydration warning — fires when server-rendered value doesn't match cookie
  /* v8 ignore start -- hydration mismatch: only fires when SSR cookie differs from client init, not reproducible in jsdom */
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      typeof document !== "undefined"
    ) {
      const cookie = hydrationCookieValue;
      if (cookie && cookie !== value) {
        console.warn(
          `useMediaPreference: cookie "${cookieName}" says "${cookie}" but rendered "${value}". ` +
            "Pass initialValue from the server to avoid flash-of-wrong-preference.",
        );
      }
    }
  }, [cookieName, hydrationCookieValue, value]); // Intentionally run only on mount
  /* v8 ignore stop */

  const set = useCallback((newValue: T) => {
    setValue(newValue);
    setSource("stored");
  }, []);

  const reset = useCallback(() => {
    clearPreferenceCookie(cookieName);
    setSource("system");
    setValue(systemValueRef.current);
  }, [cookieName]);

  return { value, source, set, reset };
}

function resolveInitialValue<T extends string>(
  initialValue: T | undefined,
  cookieName: string,
  allValues: readonly T[],
  queries: UseMediaPreferenceProps<T>["queries"],
  defaultValue: T,
): T {
  // SSR-provided value takes priority
  if (initialValue !== undefined) return initialValue;

  // Client: try cookie
  const cookie = readPreferenceCookie(cookieName);
  if (isPreferenceValue(cookie, allValues)) return cookie;

  // Client: try media queries
  if (typeof window !== "undefined") {
    for (const q of queries) {
      if (window.matchMedia(q.query).matches) return q.value;
    }
  }

  return defaultValue;
}

function resolveInitialSource<T extends string>(
  initialValue: T | undefined,
  cookieName: string,
  allValues: readonly T[],
): PreferenceSource {
  if (initialValue !== undefined) {
    // If an initial value was provided, check if there's also a cookie
    const cookie = readPreferenceCookie(cookieName);
    return isPreferenceValue(cookie, allValues) ? "stored" : "system";
  }

  const cookie = readPreferenceCookie(cookieName);
  return isPreferenceValue(cookie, allValues) ? "stored" : "system";
}

function isPreferenceValue<T extends string>(
  value: string | null,
  allValues: readonly T[],
): value is T {
  return value !== null && allValues.includes(value as T);
}
