/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { LabelProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds field-label";

/** Placeholder for internationalized messages */
const defaultMessages = {
  optional: () => "optional",
};

/**
 * description of the Label component
 * @returns {React.ReactElement} - Rendered Label
 *
 * `import { Label } from "@canonical/react-ds-global-form";`
 */
const Label = ({
  id,
  children,
  className,
  style,
  name,
  isOptional,
  requiredIndicator = "required",
  messages = defaultMessages,
  htmlFor,
  tag: Element = "label",
}: LabelProps): React.ReactElement => {
  // "required" mode marks the required fields, "optional" marks the optional
  // ones. The required marker (default "*") is drawn as a CSS `::before`
  // pseudo-element keyed off `data-required`, NOT as text: that keeps it out of
  // the label's accessible name (a screen reader would otherwise announce
  // "asterisk Email" \u2014 the required state is conveyed by `aria-required` on the
  // input instead). The "(optional)" suffix IS real text, since it's
  // informational and belongs in the accessible name.
  const markRequired = requiredIndicator === "required" && !isOptional;
  const showOptionalSuffix = requiredIndicator === "optional" && isOptional;

  return (
    <Element
      id={id}
      style={style}
      htmlFor={Element === "label" ? htmlFor : undefined}
      data-required={markRequired || undefined}
      className={[componentCssClassName, "p", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children || name}
      {showOptionalSuffix && (
        <span className="optional"> ({messages.optional()})</span>
      )}
    </Element>
  );
};

export default Label;
