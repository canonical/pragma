/** @module Preference hooks for theme, contrast, and motion */

export {
  clearPreferenceCookie,
  readPreferenceCookie,
  readPreferenceCookieFromHeader,
  writePreferenceCookie,
} from "./cookie.js";
export type { ExtractedPreferences } from "./extractPreferences.js";
export { default as extractPreferences } from "./extractPreferences.js";
export type {
  Contrast,
  Motion,
  PreferenceSource,
  Theme,
  UseMediaPreferenceProps,
  UseMediaPreferenceResult,
  UsePreferredContrastProps,
  UsePreferredContrastResult,
  UsePreferredMotionProps,
  UsePreferredMotionResult,
  UsePreferredThemeProps,
  UsePreferredThemeResult,
} from "./types.js";
export { default as useMediaPreference } from "./useMediaPreference.js";
export { default as usePreferredContrast } from "./usePreferredContrast.js";
export { default as usePreferredMotion } from "./usePreferredMotion.js";
export { default as usePreferredTheme } from "./usePreferredTheme.js";
