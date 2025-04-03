import { createFileRoute } from "@tanstack/react-router";
import type { FormValues } from "../hooks/index.js";
import { Showcase, type ShowcaseSearchParams } from "../ui/index.js";

export const Page = Showcase;

/**
 * We construct the entire page inside the Showcase component from the UI layer to separate route and component logic.
 * However, TanStack expects a named export for the route, so we need to re-export it here.
 */
export const Route = createFileRoute("/showcase")({
  // Use the re-export from above
  component: Page,
  validateSearch: (search: Record<string, unknown>): ShowcaseSearchParams => {
    return {
      exampleId: search.exampleId as string,
      settingValues: search.settingValues as FormValues,
    };
  },
});
