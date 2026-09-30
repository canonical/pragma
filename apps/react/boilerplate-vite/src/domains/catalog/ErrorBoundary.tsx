import { Component, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  /** Subtree whose render errors this boundary catches. */
  readonly children: ReactNode;
  /** Rendered in place of `children` after an error. */
  readonly fallback: ReactNode;
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
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
