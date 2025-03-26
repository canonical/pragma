import { createFileRoute } from "@tanstack/react-router";
import { Showcase as ShowcaseComponent } from "../ui/index.js";

/**
 * We construct the entire page inside the Showcase component from the UI layer to separate route and component logic.
 * However, TanStack expects a named export for the route, so we need to re-export it here.
 */
export const Showcase = ShowcaseComponent;

export const Route = createFileRoute("/showcase")({
  // Use the re-export from above
  component: Showcase,
});
