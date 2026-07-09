import type React from "react";
import { Spinner } from "../../subcomponent/Spinner/index.js";
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
  loading = false,
  disabled,
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

  const iconElement = icon && <span className="icon">{icon}</span>;

  return (
    <button
      id={id}
      className={[
        componentCssClassName,
        // The `.p` baseline utility supplies the body-text tier (font, snapped
        // line-height) and the padding-block nudges that align the button box
        // to the baseline grid — so the box height tracks the text inside.
        "p",
        importance,
        anticipation,
        variant,
        loading && "loading",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      // A loading button is busy and must not be re-triggered mid-action.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {/* The icon and label stay in the DOM while loading so the button keeps
          its width; CSS hides them (visibility:hidden) and the Spinner is
          overlaid centered on top. The label is wrapped so it can be hidden
          (a bare text child is not an element and cannot be). */}
      {iconElement}
      {hasVisibleChildren && <span className="label">{children}</span>}
      {loading && (
        <span className="loading-spinner" aria-hidden="true">
          <Spinner />
        </span>
      )}
    </button>
  );
};

export default Button;
