import type { StandardSchemaV1 } from "@canonical/router-core";
import { route } from "@canonical/router-core";
import { withHashRouter as withAddonHashRouter } from "@canonical/storybook-addon-utils";
import type { Decorator } from "@storybook/react-vite";

/**
 * Story machinery for the SidePanel's URL-held-state story: a hash router
 * with one route that declares a `panel` search parameter, exactly the shape
 * an application declares for a panel whose open state lives in the URL.
 * Storybook's iframe has no server, so the hash adapter stands in — only
 * `location.hash` changes, and navigation stays client-side.
 */

/** The search parameter value the story's panel opens on. */
export const STORY_PANEL_NAME = "ubuntu-pro";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Standard Schema v1 search validator — the same interface Zod, Valibot, and
 * ArkType implement, so any of them can be dropped in here directly.
 */
const storySearchSchema: StandardSchemaV1<
  Record<string, unknown>,
  { readonly panel?: string }
> = {
  "~standard": {
    version: 1,
    vendor: "storybook",
    validate(value) {
      const record = value as Record<string, unknown>;

      return { value: { panel: readString(record.panel) } };
    },
  },
};

/** A catch-all route carrying the panel's search parameter. */
const storyRoutes = {
  story: route({
    url: "/",
    search: storySearchSchema,
    content: () => null,
  }),
} as const;

/**
 * Wraps the story in its own hash `RouterProvider` (self-contained, owns the
 * provider), so the story can read the panel state with `useSearchParam` and
 * write it with the router's `setSearchParams` — no server needed.
 */
export const withSidePanelHashRouter: Decorator = withAddonHashRouter({
  routes: storyRoutes,
});
