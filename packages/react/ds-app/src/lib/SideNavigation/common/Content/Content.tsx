import type React from "react";
import { NavTree } from "../NavTree/index.js";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds content";

/**
 * SideNavigation.Content — main navigation region. Renders the direct children
 * of its `root` Item via useNavigationTree (selection, active state, keyboard
 * traversal). Falls back to `children` when no `root` is given.
 *
 * @implements ds:apps.subcomponent.side-navigation-content
 */
const Content = ({
  className,
  root,
  LinkComponent = "a",
  currentUrl,
  children,
  ...props
}: ContentProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {root ? (
        <NavTree
          root={root}
          currentUrl={currentUrl}
          LinkComponent={LinkComponent}
        />
      ) : (
        children
      )}
    </div>
  );
};

export default Content;
