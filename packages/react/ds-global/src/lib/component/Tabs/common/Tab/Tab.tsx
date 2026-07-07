import type React from "react";
import type { TabProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tabs-item";

/**
 * Tabs.Tab — a single tab within a Tabs strip.
 *
 * Self-contained: it renders its own `<li>` and, inside it, a link when `href`
 * is set (through its `LinkComponent`, default `"a"`) or inert text otherwise —
 * never a button. The active tab is marked `aria-current="page"`. There is no
 * shared context: each Tab reads only its own props, so a list of tabs can be
 * mapped from data or nested literally.
 *
 * @implements dso:global.subcomponent.tabs-tab
 */
const Tab = ({
  children,
  href,
  active = false,
  className,
  linkClassName,
  LinkComponent = "a",
  ...props
}: TabProps): React.ReactElement => {
  const Link = LinkComponent;
  const linkClasses = ["tabs-link", linkClassName].filter(Boolean).join(" ");
  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-active={active || undefined}
      {...props}
    >
      {href ? (
        <Link
          className={linkClasses}
          href={href}
          aria-current={active ? "page" : undefined}
        >
          {children}
        </Link>
      ) : (
        <span
          className={linkClasses}
          aria-current={active ? "page" : undefined}
        >
          {children}
        </span>
      )}
    </li>
  );
};

Tab.displayName = "Tabs.Tab";

export default Tab;
