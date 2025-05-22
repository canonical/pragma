/* @canonical/generator-canonical-ds 0.4.0-experimental.0 */
import type React from "react";
import "./styles.css";
import type { ChipPropsType } from "./types.js";

const componentCssClassName = "ds chip";

/**
 * description of the Chip component
 * @returns {React.ReactElement} - Rendered Chip
 */
const Chip = ({
  appearance = "neutral",
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
      className={[componentCssClassName, appearance, className]
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
