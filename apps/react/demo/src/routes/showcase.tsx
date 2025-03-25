import { createFileRoute } from "@tanstack/react-router";
import { Showcase as ShowcaseComponent } from "../ui/index.js";
export const Route = createFileRoute("/showcase")({
  component: Showcase,
});

export function Showcase() {
  return <ShowcaseComponent />;
}
