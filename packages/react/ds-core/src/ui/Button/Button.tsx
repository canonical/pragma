import type Props from "./types.js";
import "./styles.css";

/** Buttons are clickable elements used to perform an action. */
const Button = ({
  id,
  className,
  appearance,
  label,
  ...props
}: Props): React.ReactElement => {
  return (
    <button
      id={id}
      className={["ds", "button", appearance, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
      aria-label={label}
    >
      {`${label} and some extra text`}
    </button>
  );
};

export default Button;
