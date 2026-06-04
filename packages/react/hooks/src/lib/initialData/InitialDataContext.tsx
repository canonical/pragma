import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from "react";

/**
 * The server-resolved request payload an SSR app serialises to the client.
 *
 * Conventionally produced on the server with {@link extractPreferences} (theme,
 * contrast, motion read from the request `Cookie` header) plus any other
 * request-derived state, passed to the renderer as `initialData`, and
 * serialised to the browser as `window.__INITIAL_DATA__` by
 * `@canonical/react-ssr`. The shape is open so applications can extend it with
 * their own fields (locale, feature flags, …).
 */
export interface InitialData {
  /** Colour-scheme preference resolved from the request cookie. */
  theme?: "light" | "dark";
  /** Contrast preference resolved from the request cookie. */
  contrast?: "no-preference" | "more" | "less";
  /** Motion preference resolved from the request cookie. */
  motion?: "no-preference" | "reduce";
  /** Application-specific request-derived values. */
  [key: string]: unknown;
}

/** Global key `@canonical/react-ssr` serialises `initialData` under. */
const INITIAL_DATA_GLOBAL = "__INITIAL_DATA__";

const InitialDataContext = createContext<InitialData | undefined>(undefined);

/**
 * Provide the SSR payload to the React tree.
 *
 * Wrap the application once, near the root, on **both** the server entrypoint
 * (seeding `value` from the renderer's `initialData`) and the client entrypoint
 * (seeding it from `window.__INITIAL_DATA__`). Because both renders receive the
 * same object, values read through {@link useInitialData} are identical across
 * the server render and the first client render — preferences resolved from the
 * request cookie therefore hydrate without a flash or a mismatch.
 */
export function InitialDataProvider({
  value,
  children,
}: {
  value: InitialData;
  children: ReactNode;
}) {
  return createElement(InitialDataContext.Provider, { value }, children);
}

/**
 * Read the SSR payload.
 *
 * Resolves isomorphically: it returns the value from the nearest
 * {@link InitialDataProvider} when present, and otherwise falls back to
 * `window.__INITIAL_DATA__` on the client (and an empty object on the server).
 * The fallback means a preference-aware hook still reads the serialised value
 * even in a tree that did not mount a provider, though wrapping with
 * {@link InitialDataProvider} is preferred so the server render sees it too.
 */
export function useInitialData(): InitialData {
  const fromContext = useContext(InitialDataContext);
  if (fromContext !== undefined) return fromContext;

  if (typeof window !== "undefined") {
    const fromGlobal = (window as { [INITIAL_DATA_GLOBAL]?: InitialData })[
      INITIAL_DATA_GLOBAL
    ];
    if (fromGlobal) return fromGlobal;
  }

  return {};
}
