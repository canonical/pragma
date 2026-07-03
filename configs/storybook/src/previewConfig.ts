import type { Preview as ReactPreview } from "@storybook/react-vite";
import type { Preview as SveltePreview } from "@storybook/svelte-vite";
import type { Preview as LitPreview } from "@storybook/web-components-vite";

/**
 * Preview type for React, Svelte, and Lit Storybooks.
 * Most of the properties are the same, this is a convenience type to avoid
 * having to write the same type for all frameworks.
 */
type Preview = ReactPreview & SveltePreview & LitPreview;

/**
 * Shared preview configuration for Pragma design system Storybooks.
 * Provides consistent story sorting by ontology tier and autodocs.
 *
 * Sidebar order: the `Documentation` folder first, then the ontology tiers
 * (`subcomponents` → `components` → `groups` → `patterns`), then the non-tier
 * machinery (`common`, `utils`), and finally a `_work_in_progress` folder for
 * stories not yet ready for their tier. Only top-level folders are listed;
 * every story is expected to be foldered, so no wildcard catch-all is needed.
 *
 * NOTE: Storybook statically parses each package's own `preview.ts` for
 * `storySort` and requires the order to be an inline literal there — an imported
 * const is rejected — and it does not reliably merge `tags`/`parameters` spread
 * from an imported preview (https://github.com/storybookjs/storybook/issues/31842).
 * So the `storySort` below is not effective on its own; consuming packages must
 * copy the order inline into their local `preview.ts`. It is kept here as the
 * canonical reference for the tier order.
 *
 * Color scheme toggling is handled by @canonical/storybook-addon-utils
 * which provides .light/.dark class toggling via its toolbar control.
 */
export const previewConfig: Partial<Preview> = {
  tags: ["autodocs"],
  parameters: {
    options: {
      storySort: {
        order: [
          "Documentation",
          "subcomponents",
          "components",
          "groups",
          "patterns",
          "common",
          "utils",
          "_work_in_progress",
        ],
      },
    },
    docs: {
      codePanel: true,
    },
  },
};

export default previewConfig;
