import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import type { ColorProps, HexFormat } from "./types.js";
import "./styles.css";

const hexPatterns: Record<HexFormat, RegExp> = {
  hex3: /^#[0-9a-fA-F]{3}$/,
  hex6: /^#[0-9a-fA-F]{6}$/,
  hex8: /^#[0-9a-fA-F]{8}$/,
};

const hexMaxLengths: Record<HexFormat, number> = {
  hex3: 3,
  hex6: 6,
  hex8: 8,
};

function matchesHexFormats(value: string, formats: HexFormat[]): boolean {
  return formats.some((fmt) => hexPatterns[fmt].test(value));
}

function computeMaxLength(formats: HexFormat[]): number {
  return Math.max(...formats.map((fmt) => hexMaxLengths[fmt]));
}

const componentCssClassName = "ds input color";

const defaultSwatches = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

const defaultHexFormats: HexFormat[] = ["hex6"];

/**
 * Color input with swatch grid and hex text input.
 * @returns {React.ReactElement} - Rendered Color
 */
const Color = ({
  id,
  className,
  style,
  name,
  swatches = defaultSwatches,
  showHexInput = true,
  showCurrentColor = true,
  hexFormats = defaultHexFormats,
  disabled = false,
  registerProps,
  ...otherProps
}: ColorProps): React.ReactElement => {
  const { control } = useFormContext();
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
    rules: registerProps,
    defaultValue: "#000000",
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const currentColor = typeof value === "string" ? value : "#000000";
  const [hexText, setHexText] = useState(currentColor.replace("#", ""));

  // Mirror the Combobox List pattern: popover="manual" + useEffect
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    try {
      if (isOpen) {
        el.showPopover();
      } else {
        el.hidePopover();
      }
    } catch {
      // popover API not supported or already in target state
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const el = popoverRef.current;
      if (!el) return;
      const target = e.target as Node;
      if (!el.contains(target)) {
        setIsOpen(false);
      }
    };
    // Delay to avoid the triggering click itself closing it
    requestAnimationFrame(() => {
      document.addEventListener("click", handleClick);
    });
    return () => document.removeEventListener("click", handleClick);
  }, [isOpen]);

  const handleSwatchClick = useCallback(
    (color: string) => {
      if (!disabled) {
        onChange(color);
        setHexText(color.replace("#", ""));
        setIsOpen(false);
      }
    },
    [disabled, onChange],
  );

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setHexText(raw);
      const candidate = `#${raw}`;
      if (matchesHexFormats(candidate, hexFormats)) {
        onChange(candidate);
      }
    },
    [onChange, hexFormats],
  );

  const hasSwatches = swatches.length > 0;

  const hexInputRow = showHexInput && (
    <div
      className={["hex-input-row", !hasSwatches && "no-separator"]
        .filter(Boolean)
        .join(" ")}
    >
      {showCurrentColor && (
        <span
          className="color-preview"
          style={{ backgroundColor: currentColor }}
          aria-hidden="true"
        />
      )}
      <span className="hex-prefix" aria-hidden="true">
        #
      </span>
      <input
        type="text"
        className="hex-input"
        value={hexText}
        onChange={handleHexChange}
        maxLength={computeMaxLength(hexFormats)}
        placeholder="000000"
        disabled={disabled}
        aria-label="Hex color value"
      />
    </div>
  );

  // No swatches: render hex input inline with chrome, no popover needed
  if (!hasSwatches) {
    return (
      <div
        id={id}
        style={style}
        className={[componentCssClassName, "inline", className]
          .filter(Boolean)
          .join(" ")}
        {...otherProps}
      >
        {hexInputRow}
      </div>
    );
  }

  // With swatches: trigger button opens a popover
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="color-trigger chrome"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        {...otherProps}
      >
        {showCurrentColor && (
          <span
            className="color-preview"
            style={{ backgroundColor: currentColor }}
            aria-hidden="true"
          />
        )}
        <span className="color-value">{currentColor}</span>
      </button>

      <div ref={popoverRef} popover="manual" className="color-popover">
        <div className="swatch-grid" role="listbox" aria-label="Color swatches">
          {swatches.map((color) => (
            <button
              key={color}
              type="button"
              role="option"
              className={[
                "swatch",
                color.toLowerCase() === currentColor.toLowerCase() &&
                  "selected",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ backgroundColor: color }}
              onClick={() => handleSwatchClick(color)}
              aria-selected={color.toLowerCase() === currentColor.toLowerCase()}
              aria-label={color}
              disabled={disabled}
            />
          ))}
        </div>

        {hexInputRow}
      </div>
    </div>
  );
};

export default withWrapper<ColorProps>(Color);
