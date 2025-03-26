import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: RouteComponent,
});

/**
 * This route is purely for demonstration purposes currently.
 * There are no links to this route, and `/` redirects to the showcase route.
 * See the showcase route at ./showcase.tsx for a complete example that separates
 * route from component logic.
 */
function RouteComponent() {
  return <div>Hello "/about"!</div>;
}
