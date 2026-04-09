/** Color scheme preference: light or dark mode */
export type Theme = "light" | "dark";

/** Contrast preference: system default, increased, or decreased */
export type Contrast = "no-preference" | "more" | "less";

/** Motion preference: system default or reduced animations */
export type Motion = "no-preference" | "reduce";

/** How the current preference value was determined */
export type PreferenceSource = "stored" | "system";

/** A media query mapped to a preference value */
export interface PreferenceQuery<T extends string> {
  /** The CSS media query string, e.g. "(prefers-color-scheme: dark)" */
  query: string;
  /** The value to use when this query matches */
  value: T;
}

/** Configuration for the useMediaPreference hook */
export interface UseMediaPreferenceProps<T extends string> {
  /** Media queries to check, in priority order */
  queries: PreferenceQuery<T>[];
  /** Value when no query matches and no cookie is stored */
  defaultValue: T;
  /** All valid values for this preference (used for class cleanup) */
  allValues: readonly T[];
  /** Maps each value to a CSS class applied on documentElement. null = no class (follow system). */
  classMap: Record<T, string | null>;
  /** Cookie name for persistence */
  cookieName: string;
  /** Server-provided initial value for SSR hydration */
  initialValue?: T;
}

/** Return value of the useMediaPreference hook */
export interface UseMediaPreferenceResult<T extends string> {
  /** Current resolved value */
  value: T;
  /** How the current value was determined */
  source: PreferenceSource;
  /** Set an explicit preference (writes cookie, applies class) */
  set: (value: T) => void;
  /** Clear stored preference, revert to system */
  reset: () => void;
}

/** Props for usePreferredTheme */
export interface UsePreferredThemeProps {
  /** Server-provided initial theme for SSR hydration */
  initialValue?: Theme;
  /** Cookie name override. Defaults to "theme". */
  cookieName?: string;
}

/** Result of usePreferredTheme */
export type UsePreferredThemeResult = UseMediaPreferenceResult<Theme>;

/** Props for usePreferredContrast */
export interface UsePreferredContrastProps {
  /** Server-provided initial contrast for SSR hydration */
  initialValue?: Contrast;
  /** Cookie name override. Defaults to "contrast". */
  cookieName?: string;
}

/** Result of usePreferredContrast */
export type UsePreferredContrastResult = UseMediaPreferenceResult<Contrast>;

/** Props for usePreferredMotionProps */
export interface UsePreferredMotionProps {
  /** Server-provided initial motion for SSR hydration */
  initialValue?: Motion;
  /** Cookie name override. Defaults to "motion". */
  cookieName?: string;
}

/** Result of usePreferredMotion */
export type UsePreferredMotionResult = UseMediaPreferenceResult<Motion>;
