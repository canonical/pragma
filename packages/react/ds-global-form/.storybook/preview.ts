import previewConfig from "@canonical/storybook-config/preview";

import "./styles.css";

/**
 * Theme decorator — sets .light/.dark class and color-scheme on <html>,
 * driving design token resolution via light-dark().
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

const preview = {
  ...previewConfig,
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
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
    grid: {
      description: "Grid layout strategy",
      toolbar: {
        icon: "grid",
        items: ["intrinsic", "responsive"],
        title: "Grid",
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
    grid: "intrinsic",
  },
};

export default preview;
