import { createFileRoute, redirect } from "@tanstack/react-router";

// index route currently redirect to showcase
export const Route = createFileRoute("/")({
  loader: () => redirect({ to: "/showcase" }),
});
