import {
  type BreadcrumbItem,
  Breadcrumbs,
  type LinkComponentProps,
} from "@canonical/react-ds-global";
import { Link } from "@canonical/router-react";
import type React from "react";
import type { LensBreadcrumbsProps, LensRouteName } from "./types.js";
import { LENS_INDEX_PATH } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds lens-breadcrumbs";

/**
 * The mode strip's `context` tenant: the DS `Breadcrumbs` pattern showing
 * the trail from the lens index to the current page. It replaces the flat
 * lens-name string the strip used to carry, and it carries the page title
 * the canvas h1 no longer shows — the strip is a real navigation bar now,
 * not a label.
 *
 * The trail is URL-DERIVED and nothing else: the lens crumb is a constant
 * (the lens name + its index route), and the terminal crumb is the route
 * param the page already matched on — so this component reads no Relay
 * query, adds no operation, and never suspends the frame. It renders
 * identically on the server and the client (same URL, same params), which
 * is exactly the SSR-determinism the strip's tenants must honour: no
 * empty-then-populated hydration mismatch in the frame.
 *
 * Two shapes:
 * - INDEX (`current` absent): one crumb, the lens name, marked `current`
 *   (rendered as text, not a link) — `/definitions` shows `Definitions`.
 * - ENTITY (`current` present): the lens crumb LINKS back to the index
 *   (through the router, so the click is an SPA navigation), the entity
 *   crumb is `current` text — `/components/:uri` shows `Components / …`.
 *
 * The default DS `Breadcrumbs.Item` and the default "/" separator are used
 * unchanged (the component's own contract: Canonical products must use
 * both), so this feeds plain `items` plus the router `LinkComponent`.
 */

/**
 * The router-integration adapter the DS `Breadcrumbs` applies to every
 * NON-current item. The trail has at most one linked crumb — the lens
 * index — so a single adapter bound to that route name is enough: it
 * renders router-react's `Link` with the typed route name, so the click is
 * intercepted and routed through the SPA router (`router.navigate`) rather
 * than doing a full page load. The DS Item forwards `className` and
 * `aria-current`; `Link` derives the `href` and the current-match itself
 * from the route name, so the adapter ignores the incoming `href` (there is
 * exactly one destination — this lens's index).
 */
const lensLinkComponent =
  (lensRouteName: LensRouteName) =>
  ({ className, children }: LinkComponentProps): React.ReactElement => (
    <Link className={className} to={lensRouteName}>
      {children}
    </Link>
  );

const LensBreadcrumbs = ({
  className,
  lensLabel,
  lensRouteName,
  current,
  ...props
}: LensBreadcrumbsProps): React.ReactElement => {
  const items: BreadcrumbItem[] =
    current === undefined
      ? [{ key: lensRouteName, label: lensLabel, current: true }]
      : [
          {
            key: lensRouteName,
            label: lensLabel,
            url: LENS_INDEX_PATH[lensRouteName],
          },
          { key: current, label: current, current: true },
        ];

  return (
    <Breadcrumbs
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      items={items}
      LinkComponent={lensLinkComponent(lensRouteName)}
      {...props}
    />
  );
};

export default LensBreadcrumbs;
