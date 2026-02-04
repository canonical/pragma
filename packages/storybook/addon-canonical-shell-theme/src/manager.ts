import { type API, addons } from "storybook/manager-api";
import { ADDON_ID } from "./constants.js";
import { injectFavicon, injectThemeStyles, setupTheme } from "./lib/index.js";

addons.register(ADDON_ID, (_api: API) => {
  injectThemeStyles();
  injectFavicon();
  setupTheme();
});
