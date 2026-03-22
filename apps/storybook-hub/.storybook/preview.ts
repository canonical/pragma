import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/react-vite";

import "./styles.css";

/**
 * Theme decorator — sets .light/.dark class AND color-scheme on <html>,
 * so that both class-based selectors and CSS light-dark() resolve correctly.
 *
 * The shared previewConfig uses withThemeByClassName which only sets the class.
 * The design system's tokens use light-dark() which depends on color-scheme.
 */
const themeDecorator = (
  story: (...args: unknown[]) => unknown,
  context: { globals?: { theme?: string } },
) => {
  const theme = context.globals?.theme ?? "light";
  document.documentElement.className = theme;
  document.documentElement.style.colorScheme = theme;
  return story();
};

const preview: Preview = {
  ...previewConfig,
  decorators: [themeDecorator],
  globalTypes: {
    theme: {
      description: "Color scheme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
};

export default preview;
