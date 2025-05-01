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
      className={["ds", "buttonnnn", appearance, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      // Apply custom aria label if provided, otherwise use children text.
      // If the child is a JSX element (and not just a string), a custom aria-label should be used, otherwise the aria-label will be [object Object].
      // toString() needed to avoid type error for non-string children
      aria-label={props["aria-label"] || children?.toString()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
