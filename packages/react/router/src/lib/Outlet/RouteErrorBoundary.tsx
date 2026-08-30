import type { ComponentType, ReactNode } from "react";
import { Component, createElement } from "react";

interface RouteErrorBoundaryProps {
  readonly children: ReactNode;
  /** Component rendered with `{ error }` when a descendant render throws. */
  readonly errorComponent: ComponentType<{ readonly error: unknown }>;
}

interface RouteErrorBoundaryState {
  readonly error: unknown;
  readonly hasError: boolean;
}

/**
 * Internal error boundary composing a route's `errorComponent`.
 *
 * React requires a class component for `getDerivedStateFromError`; this is
 * the package's single private one — it is not exported. `Outlet` keys it by
 * route (alongside the route-keyed `Suspense`), so navigating to a different
 * route discards the boundary and its error state.
 */
export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: undefined, hasError: false };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { error, hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return createElement(this.props.errorComponent, {
        error: this.state.error,
      });
    }

    return this.props.children;
  }
}
