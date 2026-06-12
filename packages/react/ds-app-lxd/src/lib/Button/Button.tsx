import type Props from "./types.js";
import "./styles.css";

/** Buttons are clickable elements used to perform an action. */
const Button = ({
  id,
  className,
  children,
  style,
  appearance,
  ...props
}: Props): React.ReactElement => {
  return (
    <button
      id={id}
      className={["ds", "button", appearance, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      // Buttons derive their accessible name from their rendered text content.
      // String children are mirrored into aria-label; for any other children
      // the attribute is omitted so the name comes from the content itself.
      aria-label={
        props["aria-label"] ||
        (typeof children === "string" ? children : undefined)
      }
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
