import { type ReactElement, useId } from "react";
import type { RatingInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-rating";

const defaultFormatStarLabel = (value: number, count: number) =>
  `${value} of ${count} star${count === 1 ? "" : "s"}`;

/**
 * Presentational star-rating input — pure markup, no react-hook-form. It is a
 * radio group of `count` stars (5 or 10): exactly one value is selectable, so it
 * inherits the native radio semantics — arrow keys move and select, Tab reaches
 * the group once, and each choice is announced with its name and position.
 *
 * With `allowHalf`, every star carries two overlaid radio targets — the left
 * half selects a half rating (n − 0.5), the right half the full star (n) — so
 * the same five (or ten) stars stay on screen and clicking a star's left side
 * gives a half. The fill is masked: a star is fully or half filled by clipping
 * the solid-star glyph over the outline one.
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
  const stars = Array.from({ length: count }, (_, i) => i + 1);

  // For a star `n`, the selectable ratings it offers: [n] normally, or
  // [n - 0.5, n] when half ratings are allowed (left half then right half).
  const ratingsFor = (star: number) =>
    allowHalf ? [star - 0.5, star] : [star];

  const isChecked = (rating: number) =>
    value !== undefined ? value === rating : undefined;

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
      {stars.map((star) => (
        <span className="star" key={star}>
          {/* The star glyph: an outline star, with a solid star clipped over it
              to the filled width (0%, 50% or 100%) — set by the checked radio
              via CSS, so half and full fills use one masked shape. */}
          <span className="star-glyph" aria-hidden="true" />
          {ratingsFor(star).map((rating) => {
            const half = rating % 1 !== 0;
            const ratingId = `${groupId}-${rating}`;
            const label = formatStarLabel(rating, count);
            return (
              // The label is the positioned click target and wraps its own
              // (visually-hidden) radio, so it is a labelled control.
              <label
                key={rating}
                className={["star-target", half ? "left" : "right"].join(" ")}
                title={label}
              >
                <input
                  id={ratingId}
                  className="star-input"
                  type="radio"
                  name={name}
                  value={rating}
                  disabled={disabled}
                  data-rating={rating}
                  // Controlled when `value` is provided; uncontrolled otherwise.
                  {...(value !== undefined
                    ? { checked: isChecked(rating) }
                    : { defaultChecked: defaultValue === rating })}
                  onChange={() => onChange?.(rating)}
                />
                <span className="ds-visually-hidden">{label}</span>
              </label>
            );
          })}
        </span>
      ))}
    </div>
  );
};

export default RatingInput;
