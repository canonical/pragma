/**
 * Design tokens from the Canonical design token repository (https://github.com/canonical/design-tokens).
 *
 * These have been created manually from the source as TypeScript
 * variables because there is currently not a build process in place for
 * converting the design tokens to TypeScript.
 *
 * Values must be TypeScript variables (not CSS custom properties) and in hex
 * format (not oklch or other color spaces) because Storybook's theming
 * internally passes them through polished.js color manipulation functions
 * (opacify, darken, lighten, etc.) which cannot parse CSS var() references
 * and only support hex, rgb, rgba, hsl, and hsla formats.
 *
 * TODO: Set up a pipeline to auto-generate these from the design token source.
 */

export const tokens = {
  semanticColorLightBrandPrimary: "#e95420",
  semanticColorDarkBrandPrimary: "#e95420",

  semanticColorLightTextLink: "#0d60bd",
  semanticColorDarkTextLink: "#368bf6",

  semanticColorLightBackground: "#fff",
  semanticColorDarkBackground: "#060606",

  semanticColorLightBackgroundContainer: "#f1f1f1",
  semanticColorDarkBackgroundContainer: "#1d1d1d",

  semanticColorLightBorder: "#717171",
  semanticColorDarkBorder: "#717171",

  semanticColorLightText: "#000",
  semanticColorDarkText: "#fff",

  semanticColorLightTextOnForegroundPrimary: "#fff",
  semanticColorDarkTextOnForegroundPrimary: "#000",

  semanticColorLightTextMuted: "#636363",
  semanticColorDarkTextMuted: "#8c8c8c",

  semanticColorLightForegroundNavigationPrimary: "#f8f8f8",
  semanticColorDarkForegroundNavigationPrimary: "#131313",

  semanticColorLightForegroundNavigationPrimaryActive: "#e4e4e4",
  semanticColorDarkForegroundNavigationPrimaryActive: "#262626",

  semanticColorLightForegroundNavigationPrimaryHover: "#ebebeb",
  semanticColorDarkForegroundNavigationPrimaryHover: "#1f1f1f",

  semanticColorLightForegroundGhostBrandedHover: "#ffe9df",
  semanticColorDarkForegroundGhostBrandedHover: "#260e07",

  semanticColorLightBorderBranded: "#c13f0b",
  semanticColorDarkBorderBranded: "#c13f0b",

  semanticColorLightBorderMuted: "#ddd",
  semanticColorDarkBorderMuted: "#363636",

  semanticColorLightForegroundInput: "#f8f8f8",
  semanticColorDarkForegroundInput: "#131313",
} as const;
