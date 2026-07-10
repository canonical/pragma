import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/react-vite";
import { withI18n } from "./decorators/index.js";

import "../src/styles/index.css";

const preview: Preview = {
  ...previewConfig,
  // Every story renders inside the app's I18nProvider, so components that
  // translate (Navigation, ProductList, …) work in isolation.
  decorators: [withI18n()],
  globalTypes: {
    locale: {
      description: "Locale for the I18nProvider wrapping every story",
      toolbar: {
        title: "Locale",
        icon: "globe",
        // Keep in sync with `i18nConfig.locales` (src/i18n/config.ts) —
        // Storybook statically parses preview exports, so inline literals
        // are safer here than an imported value.
        items: ["en", "fr", "ar"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    locale: "en",
  },
};

export default preview;
