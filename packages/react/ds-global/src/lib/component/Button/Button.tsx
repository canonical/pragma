import type React from "react";
import { Spinner } from "../../subcomponent/Spinner/index.js";
import { Icon } from "../Icon/index.js";
import type Props from "./types.js";
import "./styles.css";

const componentCssClassName = "ds button";

/**
 * Buttons trigger actions within an interface, typically involving
 * data transformation or manipulation. They provide clear visual
 * indicators of the primary actions users can perform.
 *
 * `import { Button } from "@canonical/react-ds-global";`
 *
 * Fragments: renders the button plus, when `loading` is controlled, a sibling
 * status region, so the component has no single root element.
 *
 * @implements ds:global.component.button
 */
const Button = ({
  id,
  className,
  children,
  style,
  importance = "primary",
  anticipation,
  variant,
  icon,
  loading,
  loadingLabel = "Loading",
  disabled,
  onClick,
  ...props
}: Props): React.ReactElement => {
  // Booleans and nullish children render nothing; everything else (including
  // the number 0) produces visible text that names the button.
  const hasVisibleChildren =
    children != null && typeof children !== "boolean" && children !== "";

  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    (icon || loading) &&
    !hasVisibleChildren &&
    !props["aria-label"] &&
    !props["aria-labelledby"]
  ) {
    console.warn(
      "Button: icon-only buttons need an explicit `aria-label` or `aria-labelledby` to be accessible.",
    );
  }

  // The icon slot only accepts a design-system icon name; the Icon component
  // maps it to the @canonical/ds-assets sprite (decorative by default).
  const iconElement = icon && (
    <span className="icon">
      <Icon icon={icon} />
    </span>
  );

  // A loading button stays focusable (a natively disabled button would drop
  // keyboard focus to the document) and is instead marked aria-disabled, with
  // activation blocked here.
  const isBlocked = loading === true && !disabled;

  // Blocks activation while loading: preventDefault stops a form submission
  // and the consumer's handler is not invoked.
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <>
      <button
        id={id}
        className={[
          componentCssClassName,
          importance,
          anticipation,
          variant,
          loading && "loading",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
        aria-busy={loading || undefined}
        aria-disabled={isBlocked || undefined}
        disabled={disabled}
        {...props}
        onClick={handleClick}
      >
        {/* The icon and label stay in the DOM while loading to avoid layout
            shifts. */}
        {iconElement}
        {hasVisibleChildren && <span className="label">{children}</span>}
        {loading && (
          <span className="loading-spinner" aria-hidden="true">
            <Spinner />
          </span>
        )}
      </button>
      {/* The status region sits outside the button: a button's descendants
          are presentational, so a live region inside it is not reliably
          announced. It is rendered whenever the consumer controls `loading`,
          so it exists before its text changes; live regions inserted together
          with their content are not reliably announced. */}
      {loading !== undefined && (
        <span className="ds button-loading-status" role="status">
          {loading ? loadingLabel : ""}
        </span>
      )}
    </>
  );
};

export default Button;
