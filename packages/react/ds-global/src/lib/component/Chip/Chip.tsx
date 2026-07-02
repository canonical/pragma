import type React from "react";
import "./styles.css";
import type { ChipPropsType } from "./types.js";

const componentCssClassName = "ds chip";

/**
 * A chip is a compact, interactive component used to represent an attribute,
 * entity, or filter while facilitating secondary actions.
 *
 * @implements ds:global.component.chip
 */
const Chip = ({
  criticality,
  release,
  lead,
  value,
  onClick,
  onDismiss,
  id,
  className,
  style,
  ...props
}: ChipPropsType): React.ReactElement => {
  const Container = onClick ? "button" : "span";
  return (
    <Container
      id={id}
      style={style}
      className={[componentCssClassName, criticality, release, className]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      {...props}
    >
      {lead && <span className="lead">{lead}</span>}
      {value && <span className="value">{value}</span>}
      {onDismiss && (
        <button
          type="button"
          className="dismiss"
          aria-label="Dismiss"
          onClick={() => onDismiss()}
        />
      )}
    </Container>
  );
};

export default Chip;
