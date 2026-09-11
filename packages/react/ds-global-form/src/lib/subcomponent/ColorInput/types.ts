import type { ComponentProps } from "react";

export type HexFormat = "hex6" | "hex3" | "hex8";

type OwnProps = {
  /** Controlled value — supplied by the field tier, or directly when standalone. */
  value?: string;

  /** Change handler — receives the new hex string. */
  onChange?: (value: string) => void;

  /** Whether the input is disabled */
  disabled?: boolean;

  /** Predefined color swatches to display */
  swatches?: string[];

  /** Show hex text input (default true) */
  showHexInput?: boolean;

  /** Show current color preview swatch (default true) */
  showCurrentColor?: boolean;

  /** Accepted hex formats (default ["hex6"]) */
  hexFormats?: HexFormat[];
};

/** Props for the presentational Color input (no react-hook-form). Renders a
 * `<div class="ds input color">` as its root. */
export type ColorInputProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
