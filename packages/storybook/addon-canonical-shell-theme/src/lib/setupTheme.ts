import { addons } from "storybook/manager-api";
import { THEME } from "../theme/index.js";

export function setupTheme() {
  const prefersColorSchemeDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  );
  function updateTheme() {
    addons.setConfig({
      theme: {
        brandTitle: process.env.PROJECT_NAME,
        brandImage: process.env.PROJECT_LOGO,
        ...(prefersColorSchemeDark.matches ? THEME.dark : THEME.light),
      },
    });
  }

  prefersColorSchemeDark.addEventListener("change", updateTheme);
  updateTheme();
}
