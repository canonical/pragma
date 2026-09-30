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

  it("keeps showing the fallback while the subject is unchanged", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary fallback={<p role="alert">Failed.</p>} resetKey="a">
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    // Same key, healthy child: a caught error is sticky by design, so an
    // ordinary rerender must NOT retry the subtree.
    rerender(
      <ErrorBoundary fallback={<p role="alert">Failed.</p>} resetKey="a">
        <p>Graph content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Graph content")).not.toBeInTheDocument();
  });

  it("retries the subtree when the subject changes", async () => {
    // Raised in review. A param-only navigation (`/components/a` →
    // `/components/b`) does not remount the page — the router keys its outlet
    // by route name — so without this one failed query would leave every
    // later entity on the fallback until a full page reload.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary fallback={<p role="alert">Failed.</p>} resetKey="a">
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    rerender(
      <ErrorBoundary fallback={<p role="alert">Failed.</p>} resetKey="b">
        <p>Graph content</p>
      </ErrorBoundary>,
    );

    expect(await screen.findByText("Graph content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
