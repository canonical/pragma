/**
 * Design tokens for the Storybook shell theme.
 *
 * Source: @canonical/design-tokens (~/code/cn/design-tokens/packages/tokens/dist)
 *
 * All values MUST be hex. Storybook's UI components use polished.js
 * (parseToRgb, opacify, darken, lighten, transparentize) pervasively
 * in styled-components — not just in the theme conversion layer but
 * throughout the manager UI (buttons, tooltips, tabs, etc.).
 * polished.js only supports hex, rgb, rgba, hsl, and hsla.
 * CSS var() and oklch will crash at runtime.
 *
 * TODO: Automate hex generation from @canonical/design-tokens.
 */

export const tokens = {
  // --color-brand-primary → palette-orange-398
  semanticColorLightBrandPrimary: "#e9531f",
  semanticColorDarkBrandPrimary: "#e9531f",

  // --color-text-link → light: palette-blue-590, dark: palette-blue-398
  semanticColorLightTextLink: "#0c60bd",
  semanticColorDarkTextLink: "#358af5",

  // --color-background → light: palette-white, dark: palette-gray-990
  semanticColorLightBackground: "#ffffff",
  semanticColorDarkBackground: "#050505",

  // --color-background-container → light: palette-gray-40, dark: palette-gray-930
  semanticColorLightBackgroundContainer: "#f0f0f0",
  semanticColorDarkBackgroundContainer: "#1d1d1d",

  // --color-border → palette-gray-520
  semanticColorLightBorder: "#707070",
  semanticColorDarkBorder: "#707070",

  // --color-text → light: palette-black, dark: palette-white
  semanticColorLightText: "#000000",
  semanticColorDarkText: "#ffffff",

  // --color-text-onForegroundPrimary → light: palette-white, dark: palette-black
  semanticColorLightTextOnForegroundPrimary: "#ffffff",
  semanticColorDarkTextOnForegroundPrimary: "#000000",

  // --color-text-muted → light: palette-gray-590, dark: palette-gray-398
  semanticColorLightTextMuted: "#636363",
  semanticColorDarkTextMuted: "#8c8c8c",

  // --color-foreground-navigation-primary → light: palette-gray-20, dark: palette-gray-960
  semanticColorLightForegroundNavigationPrimary: "#f7f7f7",
  semanticColorDarkForegroundNavigationPrimary: "#121212",

  // --color-foreground-navigation-primary-active → light: oklch(92%), dark: oklch(27%)
  semanticColorLightForegroundNavigationPrimaryActive: "#e4e4e4",
  semanticColorDarkForegroundNavigationPrimaryActive: "#262626",

  // --color-foreground-navigation-primary-hover → light: oklch(94%), dark: oklch(24%)
  semanticColorLightForegroundNavigationPrimaryHover: "#eaeaea",
  semanticColorDarkForegroundNavigationPrimaryHover: "#1f1f1f",

  // --color-foreground-ghost-branded-hover → light: oklch(96% 0.04 37.5), dark: oklch(20% 0.04 38.5)
  semanticColorLightForegroundGhostBrandedHover: "#ffe9df",
  semanticColorDarkForegroundGhostBrandedHover: "#260e06",

  // --color-border-branded → palette-orange-520
  semanticColorLightBorderBranded: "#c03f0b",
  semanticColorDarkBorderBranded: "#c03f0b",

  // --color-border-muted → light: palette-gray-100, dark: palette-gray-820
  semanticColorLightBorderMuted: "#dcdcdc",
  semanticColorDarkBorderMuted: "#363636",

  // --color-foreground-input → light: palette-gray-20, dark: palette-gray-960
  semanticColorLightForegroundInput: "#f7f7f7",
  semanticColorDarkForegroundInput: "#121212",
} as const;
