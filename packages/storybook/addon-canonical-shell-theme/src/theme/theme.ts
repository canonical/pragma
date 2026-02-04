import { create } from "storybook/theming";

const BASE_THEME = {
  fontBase: "var(--font-ubuntu-sans)",
  fontCode: "var(--font-ubuntu-sans-mono)",
  appBorderRadius: 0,
  inputBorderRadius: 0,
};

const LIGHT_THEME = create({
  ...BASE_THEME,
  base: "light",
  colorPrimary: "#E95420",
  colorSecondary: "#4F4F4F",

  buttonBg: "#E95420",

  // UI
  appBg: "#f3f3f3",
  appContentBg: "#f3f3f3",
  appPreviewBg: "#f7f7f7",
  appBorderColor: "rgba(0, 0, 0, 0.2)",
  // Text colors
  textColor: "#000",
  textInverseColor: "#FFF",

  // Toolbar default and active colors
  barTextColor: "#000",
  barSelectedColor: "#E95420",
  barHoverColor: "#000",
  barBg: "#f3f3f3",

  textMutedColor: "#000",
});

const DARK_THEME = create({
  ...BASE_THEME,
  base: "dark",
  colorPrimary: "#E8541F",
  colorSecondary: "#777",
  buttonBg: "#E8541F",

  // UI
  appBg: "#262626",
  appContentBg: "#262626",
  appPreviewBg: "#202020",
  appBorderColor: "rgba(255, 255, 255, 0.2)",

  // Text colors
  textColor: "#FFF",
  textInverseColor: "#000",

  // Toolbar default and active colors
  barTextColor: "#FFF",
  barSelectedColor: "#E8541F",
  barHoverColor: "#FFF",
  barBg: "#262626",

  textMutedColor: "#FFF",
});

export const THEME = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
};
