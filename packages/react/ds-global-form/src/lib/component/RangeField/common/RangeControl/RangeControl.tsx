import {
  type ChangeEvent,
  forwardRef,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RangeControlProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds range-control";

/**
 * Presentational range control: a canonical NUMBER input paired with a slider
 * that mirrors it. Pure markup, no react-hook-form.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS SHAPE (do NOT "simplify" without re-checking the a11y/no-JS contract)
 * ─────────────────────────────────────────────────────────────────────────────
 * Two visible controls drive ONE value. WCAG (SC 1.3.1 / 3.3.2 / 4.1.2): a
 * `<label for>` can only associate with ONE input, so we do NOT try to make the
 * slider and the number "share" a label. Instead:
 *
 *  - The NUMBER input is CANONICAL: it carries the field `name`/`id`, takes the
 *    react-hook-form `register()` binding, and is the labelable target of the
 *    field's real `<label for>` (1:1, programmatically correct). It is the
 *    no-JS baseline — a user can type an exact value and submit it with scripts
 *    disabled.
 *  - The SLIDER is a JS-ONLY enhancement: it is mounted only after hydration
 *    (`mounted` flag), so with no JS the user is shown ONLY the working number
 *    input — never a dead/misleading slider that can't sync (there is no native,
 *    no-JS way to keep two editable inputs in sync, nor to render a range's live
 *    value as text). The slider carries no `name` (it must not double-submit)
 *    and gets its own `aria-label` so screen-reader users can tell the two
 *    controls apart.
 *  - Sync: dragging the slider writes through to the number input by setting its
 *    value via the native value setter and dispatching a real `input` event, so
 *    react-hook-form (which is registered on the number input) observes the
 *    change. The number input typing back-fills the slider via local state.
 *
 * See pragma-adrs N.04 / spec DE080. @returns {ReactElement}
 */
export const RangeControl = forwardRef<HTMLInputElement, RangeControlProps>(
  function RangeControl(
    {
      id,
      className,
      style,
      min,
      max,
      step,
      sliderLabel = "Slider",
      onChange,
      ...numberProps
    },
    ref,
  ): ReactElement {
    const numberRef = useRef<HTMLInputElement | null>(null);
    // Slider is client-only: no-JS users see just the canonical number input.
    const [mounted, setMounted] = useState(false);
    // Mirror of the current value used to drive the (controlled) slider.
    const [sliderValue, setSliderValue] = useState<string>(
      numberProps.value != null
        ? String(numberProps.value)
        : numberProps.defaultValue != null
          ? String(numberProps.defaultValue)
          : "",
    );

    useEffect(() => setMounted(true), []);

    // Compose the forwarded RHF ref with our local ref to the number input.
    const setNumberRef = (node: HTMLInputElement | null) => {
      numberRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
      setSliderValue(e.target.value);
      onChange?.(e);
    };

    const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setSliderValue(next);
      // Write through to the canonical number input so react-hook-form (bound to
      // it) sees the change: set the value via the native setter and dispatch a
      // real `input` event, which React/RHF listen for.
      const node = numberRef.current;
      if (node) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(node, next);
        node.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    return (
      <div
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
      >
        <input
          {...numberProps}
          id={id}
          ref={setNumberRef}
          type="number"
          className="ds input number chrome range-number p"
          min={min}
          max={max}
          step={step}
          onChange={handleNumberChange}
        />
        {mounted && (
          <input
            type="range"
            className="ds range range-slider"
            aria-label={sliderLabel}
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            disabled={numberProps.disabled}
            onChange={handleSliderChange}
          />
        )}
      </div>
    );
  },
);

export default RangeControl;
