import { createFileRoute } from "@tanstack/react-router";
import { ShowcaseComponent } from "../ui/index.js";
export const Route = createFileRoute("/showcase")({
  component: Showcase,
});

export function Showcase() {
  return <ShowcaseComponent />;
}
