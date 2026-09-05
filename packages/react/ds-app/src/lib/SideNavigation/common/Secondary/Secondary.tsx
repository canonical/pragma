import type React from "react";
import { Content } from "../Content/index.js";
import type { SecondaryProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-secondary";

/**
 * SideNavigation.Secondary — a second navigation landmark, a sibling of
 * `SideNavigation` rather than a child of it (SPEC.md §1.3). Cannot
 * collapse. Its title mirrors the primary item that opened it (or, when
 * that item is named after something else — e.g. the signed-in user —
 * describes the nature of the items shown instead). Mounting/unmounting
 * this component (showing/hiding it as primary navigation changes) is
 * entirely the consumer's responsibility — see SPEC.md §4.2.
 *
 * Reuses `SideNavigation.Content` for its own content region (same
 * overflow-fade treatment; `root`'s `SecondaryNavRoot` shape is a subtype
 * of the `NavRoot` `Content` already accepts).
 *
 * @implements ds:apps.pattern.side-navigation-secondary
 */
const Secondary = ({
  title,
  root,
  LinkComponent = "a",
  currentUrl,
  className,
  "aria-label": ariaLabel,
  ...props
}: SecondaryProps): React.ReactElement => (
  <nav
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
    aria-label={ariaLabel ?? title}
  >
    <header className="header">
      <span className="title p">{title}</span>
    </header>
    <Content
      root={root}
      LinkComponent={LinkComponent}
      currentUrl={currentUrl}
    />
  </nav>
);

export default Secondary;
