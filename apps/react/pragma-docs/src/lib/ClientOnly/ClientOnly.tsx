import { type ReactElement, type ReactNode, useEffect, useState } from "react";

export interface ClientOnlyProps {
  /** Content rendered only after the component mounts in the browser. */
  readonly children: ReactNode;
  /** Rendered during SSR and the initial hydration pass. Defaults to nothing. */
  readonly fallback?: ReactNode;
}

/**
 * Defers `children` until after hydration, so they render only in the browser.
 *
 * The server (and React's first client pass, so hydration stays
 * mismatch-free) renders `fallback`; the mount effect then flips to
 * `children`. Use this for content that must not run during server
 * rendering — e.g. components that fetch on render, like the Relay example
 * on the catalog page, until server-side data serialization/hydration lands
 * in a follow-up PR.
 */
export default function ClientOnly({
  children,
  fallback = null,
}: ClientOnlyProps): ReactElement {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return <>{isMounted ? children : fallback}</>;
}
