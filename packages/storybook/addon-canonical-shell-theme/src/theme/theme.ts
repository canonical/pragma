import { create } from "storybook/theming";
import canonicalDarkLogo from "../assets/canonical-dark.svg?inline";
import canonicalLightLogo from "../assets/canonical-light.svg?inline";
import { tokens } from "./tokens.js";

const BASE_THEME = {
  fontBase: "var(--font-ubuntu-sans)",
  fontCode: "var(--font-ubuntu-sans-mono)",
  appBorderRadius: 0,
  inputBorderRadius: 0,
};

const LIGHT_THEME = create({
  ...BASE_THEME,
  base: "light",
  brandImage: canonicalLightLogo,

  // Colors
  colorPrimary: tokens.semanticColorLightBrandPrimary,
  colorSecondary: tokens.semanticColorLightTextLink,

  // UI
  appBg: tokens.semanticColorLightBackground,
  appContentBg: tokens.semanticColorLightBackground,
  appPreviewBg: tokens.semanticColorLightBackgroundContainer,
  appBorderColor: tokens.semanticColorLightBorderMuted,
  appHoverBg: tokens.semanticColorLightForegroundNavigationPrimaryHover,

  // Text
  textColor: tokens.semanticColorLightText,
  textInverseColor: tokens.semanticColorLightTextOnForegroundPrimary,
  textMutedColor: tokens.semanticColorLightTextMuted,

  // Toolbar
  barTextColor: tokens.semanticColorLightText,
  barSelectedColor: tokens.semanticColorLightText,
  barHoverColor: tokens.semanticColorLightText,
  barBg: tokens.semanticColorLightForegroundNavigationPrimary,

  // Buttons
  buttonBg: tokens.semanticColorLightForegroundGhostBrandedHover,
  buttonBorder: tokens.semanticColorLightBorderBranded,

  // Boolean (toggle) inputs
  booleanBg: tokens.semanticColorLightBorder,
  booleanSelectedBg: tokens.semanticColorLightForegroundInput,

  // Form inputs
  inputBg: tokens.semanticColorLightForegroundInput,
  inputBorder: tokens.semanticColorLightBorder,
  inputTextColor: tokens.semanticColorLightText,
});

const DARK_THEME = create({
  ...BASE_THEME,
  base: "dark",
  brandImage: canonicalDarkLogo,

  // Colors
  colorPrimary: tokens.semanticColorDarkBrandPrimary,
  colorSecondary: tokens.semanticColorDarkTextLink,

  // UI
  appBg: tokens.semanticColorDarkBackground,
  appContentBg: tokens.semanticColorDarkBackground,
  appPreviewBg: tokens.semanticColorDarkBackgroundContainer,
  appBorderColor: tokens.semanticColorDarkBorderMuted,
  appHoverBg: tokens.semanticColorDarkForegroundNavigationPrimaryHover,

  // Text
  textColor: tokens.semanticColorDarkText,
  textInverseColor: tokens.semanticColorDarkTextOnForegroundPrimary,
  textMutedColor: tokens.semanticColorDarkTextMuted,

  // Toolbar
  barTextColor: tokens.semanticColorDarkText,
  barSelectedColor: tokens.semanticColorDarkText,
  barHoverColor: tokens.semanticColorDarkText,
  barBg: tokens.semanticColorDarkForegroundNavigationPrimary,

  // Buttons
  buttonBg: tokens.semanticColorDarkForegroundGhostBrandedHover,
  buttonBorder: tokens.semanticColorDarkBorderBranded,

  // Boolean (toggle) inputs
  booleanBg: tokens.semanticColorDarkBorder,
  booleanSelectedBg: tokens.semanticColorDarkForegroundInput,

  // Form inputs
  inputBg: tokens.semanticColorDarkForegroundInput,
  inputBorder: tokens.semanticColorDarkBorder,
  inputTextColor: tokens.semanticColorDarkText,
});

export const THEME = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
};
