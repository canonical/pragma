import type React from "react";
import { NavTree } from "../NavTree/index.js";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds content";

/**
 * SideNavigation.Content — the component's main `<nav>` landmark, and the
 * only one: navigation rows are links and expandable items exclusively
 * (actions are Footer's job). Data-only — rows render exclusively from the
 * `root` tree (row components are private; there is no children escape
 * hatch into the landmark). `aria-label` defaults to `"Main navigation"`
 * and may be overridden by the consumer; with no `root`, the landmark
 * renders empty (the landmark contract stays stable).
 *
 * @implements ds:apps.subcomponent.side-navigation-content
 */
const Content = ({
  className,
  root,
  LinkComponent = "a",
  currentUrl,
  ...props
}: ContentProps): React.ReactElement => {
  return (
    <nav
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {root ? (
        <NavTree
          root={root}
          currentUrl={currentUrl}
          LinkComponent={LinkComponent}
        />
      ) : null}
    </nav>
  );
};

export default Content;
