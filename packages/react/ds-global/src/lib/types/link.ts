import type { ComponentType, HTMLAttributes, ReactNode } from "react";

/**
 * Props passed to a custom `LinkComponent` for router integration.
 *
 * The single, shared contract for every component that injects one link
 * renderer for its navigable items (Breadcrumbs, SideNavigation, Tabs, ...).
 * Deliberately narrow — only these four props are forwarded, not the full
 * anchor attribute set — so the same router `Link` (e.g.
 * `@canonical/router-react`, Next.js, React Router) works across all of them.
 * The component receives `aria-current` and must forward it to the rendered
 * anchor.
 *
 * @see cs:react.component.link_component
 */
export interface LinkComponentProps {
  href?: string;
  className?: string;
  children?: ReactNode;
  "aria-current"?: HTMLAttributes<HTMLElement>["aria-current"];
}

/**
 * The `LinkComponent` prop type: a component honouring {@link LinkComponentProps},
 * or the intrinsic `"a"` element (the default when none is supplied).
 */
export type LinkComponent = ComponentType<LinkComponentProps> | "a";
