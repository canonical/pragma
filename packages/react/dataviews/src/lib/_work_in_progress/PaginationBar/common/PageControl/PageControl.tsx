import { Button, Icon } from "@canonical/react-ds-global";
import type { MouseEvent, ReactElement } from "react";
import type { PageControlProps } from "./types.js";

const componentCssClassName = "ds button";

/**
 * Whether a click means "go here, in this tab": a plain primary click. A
 * modified click or another button asks the browser for something else —
 * a new tab, a saved link — and keeps the link's own behaviour.
 */
const isPlainClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

/**
 * One way to another page. A reachable page with a destination is a real
 * link, so it works before any script runs and opens in a new tab like any
 * other; rendered through the consumer's router link where one is given —
 * the router then navigates, and the provider hears it through its location
 * port — and through the intrinsic anchor otherwise, where the enhancement
 * intercepts a plain click and moves the window in place. An unreachable
 * page is a disabled button named for where it would go, and a page with
 * no destination — a provider given no location — is a button that only
 * the enhancement can drive, hidden until scripting is enabled.
 *
 * The link is drawn as the design system's Button: the Button renders no
 * link, so its classes and its icon slot are borrowed here by hand, a
 * deviation recorded in the bar's anatomy; a link variant of the Button is
 * asked of the design system, and this borrowing goes when it lands.
 */
export default function PageControl({
  label,
  icon,
  className,
  destination,
  reachable,
  onNavigate,
  LinkComponent,
}: PageControlProps): ReactElement {
  if (reachable && destination !== null) {
    const href = `?${destination}`;
    const linkClassName = [componentCssClassName, "tertiary", className].join(
      " ",
    );
    // The icon names the link: the shared link contract carries no
    // attribute for a name, and the name from content reaches every router.
    const content = (
      <span className="icon">
        <Icon icon={icon} aria-label={label} />
      </span>
    );
    if (LinkComponent === "a") {
      return (
        <a
          className={linkClassName}
          href={href}
          onClick={(event) => {
            if (isPlainClick(event)) {
              event.preventDefault();
              onNavigate();
            }
          }}
        >
          {content}
        </a>
      );
    }
    return (
      <LinkComponent href={href} className={linkClassName}>
        {content}
      </LinkComponent>
    );
  }
  return (
    <Button
      type="button"
      importance="tertiary"
      icon={icon}
      className={[destination === null && "scripted", className]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      disabled={!reachable}
      onClick={onNavigate}
    />
  );
}
