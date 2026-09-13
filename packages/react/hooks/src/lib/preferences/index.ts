/** @module Preference hooks for theme, contrast, motion, and keyboard shortcuts */

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
  Shortcuts,
  Theme,
  UseMediaPreferenceProps,
  UseMediaPreferenceResult,
  UsePreferredContrastProps,
  UsePreferredContrastResult,
  UsePreferredMotionProps,
  UsePreferredMotionResult,
  UsePreferredShortcutsProps,
  UsePreferredShortcutsResult,
  UsePreferredThemeProps,
  UsePreferredThemeResult,
} from "./types.js";
export { default as useMediaPreference } from "./useMediaPreference.js";
export { default as usePreferredContrast } from "./usePreferredContrast.js";
export { default as usePreferredMotion } from "./usePreferredMotion.js";
export { default as usePreferredShortcuts } from "./usePreferredShortcuts.js";
export { default as usePreferredTheme } from "./usePreferredTheme.js";
