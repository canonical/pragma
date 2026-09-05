import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary.js";

/** A child that throws during render, the way a failed query hook does. */
function ThrowingChild(): ReactElement {
  throw new Error("backend unreachable");
}

describe("ErrorBoundary component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children while nothing throws", () => {
    render(
      <ErrorBoundary fallback={<p role="alert">Failed.</p>}>
        <p>Graph content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Graph content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the fallback when a child render throws", async () => {
    // React logs errors caught by boundaries; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<p role="alert">The graph failed to load.</p>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    // The fallback replaces the subtree instead of white-screening.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The graph failed to load.",
    );
    expect(screen.queryByText("Graph content")).not.toBeInTheDocument();
  });
});
