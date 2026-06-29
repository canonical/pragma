import type { BaseProps } from "../types.js";

export type HexFormat = "hex6" | "hex3" | "hex8";

/** Props for the presentational Color input (no react-hook-form). */
export type ColorInputProps = BaseProps & {
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
