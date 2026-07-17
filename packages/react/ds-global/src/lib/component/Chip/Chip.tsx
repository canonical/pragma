import type React from "react";
import "./styles.css";
import type { ChipPropsType } from "./types.js";

const componentCssClassName = "ds chip";

/**
 * A chip is a compact, interactive component used to represent an attribute,
 * entity, or filter while facilitating secondary actions.
 *
 * The root element is variable: a chip with an `onClick` renders a `<button>`
 * (and extends button props), one without renders a `<span>` (and extends span
 * props). Each branch spreads only the native props of its own root — the
 * DS-owned props are destructured out first so none of them leak to the DOM.
 *
 * @implements ds:global.component.chip
 */
const Chip = (props: ChipPropsType): React.ReactElement => {
  const className = [
    componentCssClassName,
    props.criticality,
    props.release,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {props.lead && <span className="lead">{props.lead}</span>}
      {props.value && <span className="value">{props.value}</span>}
      {props.onDismiss && (
        <button
          type="button"
          className="dismiss"
          aria-label="Dismiss"
          onClick={() => props.onDismiss?.()}
        />
      )}
    </>
  );

  // Interactive chip → <button>. Its native button props (including onClick)
  // are forwarded after the DS-owned props are stripped off.
  if (props.onClick) {
    const {
      criticality: _criticality,
      release: _release,
      lead: _lead,
      value: _value,
      onDismiss: _onDismiss,
      className: _className,
      ...rest
    } = props;
    return (
      // Default type="button" so a Chip inside a <form> doesn't submit it on
      // click (the native default is "submit"); placed before the spread so a
      // caller can still override it via the native `type` prop.
      <button type="button" className={className} {...rest}>
        {content}
      </button>
    );
  }

  // Static chip → <span>.
  const {
    criticality: _criticality,
    release: _release,
    lead: _lead,
    value: _value,
    onDismiss: _onDismiss,
    onClick: _onClick,
    className: _className,
    ...rest
  } = props;
  return (
    <span className={className} {...rest}>
      {content}
    </span>
  );
};

export default Chip;
