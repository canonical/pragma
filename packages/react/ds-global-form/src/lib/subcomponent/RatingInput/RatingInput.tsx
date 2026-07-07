import { type ReactElement, useId } from "react";
import type { RatingInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-rating";

const defaultFormatStarLabel = (value: number, count: number) =>
  `${value} of ${count} star${count === 1 ? "" : "s"}`;

/**
 * Presentational star-rating input — pure markup, no react-hook-form. It is a
 * radio group of stars (5 or 10, optionally in half steps): exactly one value
 * is selectable, so it inherits the native radio semantics — arrow keys move
 * and select, Tab reaches the group once, and each step is announced with its
 * name and position. The steps are `<label>`s over visually-hidden radios; CSS
 * fills every star up to the checked (or hovered) one, with the half-star steps
 * filling only the leading half.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled via
 * `defaultValue`).
 *
 * `import { RatingInput } from "@canonical/react-ds-global-form";`
 */
export const RatingInput = ({
  id,
  className,
  style,
  name,
  count = 5,
  allowHalf = false,
  value,
  defaultValue,
  onChange,
  disabled = false,
  formatStarLabel = defaultFormatStarLabel,
  ...labelling
}: RatingInputProps): ReactElement => {
  const reactId = useId();
  const groupId = id ?? reactId;

  // One radio per selectable step. Half-steps double the count; each step's
  // rating is `step/2` (0.5, 1, 1.5 …) when half, else `step` (1, 2, 3 …).
  const stepCount = allowHalf ? count * 2 : count;
  const steps = Array.from({ length: stepCount }, (_, i) => {
    const step = i + 1;
    const rating = allowHalf ? step / 2 : step;
    return { step, rating, isHalf: allowHalf && step % 2 === 1 };
  });

  return (
    <div
      id={groupId}
      style={style}
      className={[componentCssClassName, allowHalf && "half", className]
        .filter(Boolean)
        .join(" ")}
      role="radiogroup"
      aria-label={
        labelling["aria-labelledby"]
          ? undefined
          : (labelling["aria-label"] ?? "Rating")
      }
      aria-labelledby={labelling["aria-labelledby"]}
    >
      {steps.map(({ step, rating, isHalf }) => {
        const stepId = `${groupId}-${step}`;
        const label = formatStarLabel(rating, count);
        return (
          <label
            key={step}
            className={["star", isHalf && "star-half"]
              .filter(Boolean)
              .join(" ")}
            htmlFor={stepId}
            title={label}
          >
            <input
              id={stepId}
              className="star-input"
              type="radio"
              name={name}
              value={rating}
              disabled={disabled}
              // Controlled when `value` is provided; uncontrolled otherwise.
              {...(value !== undefined
                ? { checked: value === rating }
                : { defaultChecked: defaultValue === rating })}
              onChange={() => onChange?.(rating)}
            />
            <span className="star-glyph" aria-hidden="true">
              ★
            </span>
            <span className="ds-visually-hidden">{label}</span>
          </label>
        );
      })}
    </div>
  );
};

export default RatingInput;
