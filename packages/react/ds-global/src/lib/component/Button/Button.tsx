import type React from "react";
import { Spinner } from "#lib/subcomponent/Spinner/index.js";
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
  importance,
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

  // While loading, the Spinner takes the single leading icon slot; otherwise
  // the consumer's icon (if any) does.
  const leading = loading ? (
    <span className="icon">
      <Spinner />
    </span>
  ) : (
    icon && <span className="icon">{icon}</span>
  );

  return (
    <button
      id={id}
      className={[
        componentCssClassName,
        importance,
        anticipation,
        variant,
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
      {leading}
      {children}
    </button>
  );
};

export default Button;
