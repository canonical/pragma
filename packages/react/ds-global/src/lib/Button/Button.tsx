import type React from "react";
import type Props from "./types.js";
import "./styles.css";

const componentCssClassName = "ds button";

/**
 * Buttons trigger actions within an interface, typically involving
 * data transformation or manipulation. They provide clear visual
 * indicators of the primary actions users can perform.
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
  iconPosition = "start",
  ...props
}: Props): React.ReactElement => {
  // Booleans and nullish children render nothing; everything else (including
  // the number 0) produces visible text that names the button.
  const hasVisibleChildren =
    children != null && typeof children !== "boolean" && children !== "";

  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    icon &&
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
        importance,
        anticipation,
        variant,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...props}
    >
      {iconPosition === "start" ? (
        <>
          {iconElement}
          {children}
        </>
      ) : (
        <>
          {children}
          {iconElement}
        </>
      )}
    </button>
  );
};

export default Button;
