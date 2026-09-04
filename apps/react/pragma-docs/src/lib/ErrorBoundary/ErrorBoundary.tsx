import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  /** Subtree whose render errors this boundary catches. */
  readonly children: ReactNode;
  /** Rendered in place of `children` after an error. */
  readonly fallback: ReactNode;
  /**
   * Identity of what the subtree is showing. When it changes, a boundary that
   * has already caught goes back to rendering `children`.
   *
   * Needed because a param-only navigation does NOT remount the page: the
   * router keys its outlet by route NAME, so `/components/a` → `/components/b`
   * reuses the same component instance, and with it this boundary's state. One
   * failed query would otherwise leave every later entity on the fallback until
   * a full page reload. Pass the thing the subtree is about — the entity's URI,
   * the term — not a counter.
   */
  readonly resetKey?: unknown;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Catches render errors below it and renders `fallback` instead of letting
 * the error unmount the whole tree to a blank page.
 *
 * Relay's `useLazyLoadQuery` re-throws query errors during render — Suspense
 * only handles the pending state — so a data-driven subtree needs both
 * boundaries: Suspense for loading, this for failure (the canonical Relay
 * pairing; see `CatalogPage`). A class component because error boundaries
 * have no hook equivalent.
 *
 * A caught error is sticky by design — React does not retry a failed subtree —
 * so a boundary that outlives what it was showing needs to be told when to try
 * again. That is `resetKey`.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  /**
   * Report before rendering the fallback.
   *
   * Without this the error object reaches nothing the app owns: the boundary
   * catches, swaps in the fallback, and the cause is gone. That is worst where
   * a caller passes `fallback={null}` — the subtree renders as literally
   * nothing, with no trace anyone can act on. Rendering the fallback is the
   * boundary's job; discarding the diagnosis is not.
   */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "[error-boundary] subtree failed",
      error,
      info.componentStack,
    );
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /**
   * Clear a caught error when the subtree's subject changes.
   *
   * Guarded on `hasError` so an ordinary rerender never calls `setState`, and
   * compared with `!==` so passing the same URI twice is not a reset.
   */
  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
