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
  // Derive aria-label from children if not explicitly provided
  const ariaLabel =
    props["aria-label"] ||
    (typeof children === "string" ? children : undefined);

  const iconElement = icon && <span className="icon">{icon}</span>;

  return (
    <button
      id={id}
      className={[componentCssClassName, importance, anticipation, variant, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-label={ariaLabel}
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
