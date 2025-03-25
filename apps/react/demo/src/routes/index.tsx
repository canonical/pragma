import { createFileRoute } from "@tanstack/react-router";
import { Showcase } from "./showcase.js";

// For now, redirect all requests to the showcase
export const Route = createFileRoute("/")({
  component: Showcase,
});

function Index() {
  return <span>Home</span>;
}
