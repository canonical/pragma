import type { InputProps } from "../../types.js";

export type HexFormat = "hex6" | "hex3" | "hex8";

type AdditionalColorProps = {
  /** Predefined color swatches to display */
  swatches?: string[];

  /** Show hex text input (default true) */
  showHexInput?: boolean;

  /** Show current color preview swatch (default true) */
  showCurrentColor?: boolean;

  /** Accepted hex formats (default ["hex6"]) */
  hexFormats?: HexFormat[];

  /** Whether the input is disabled */
  disabled?: boolean;
};

export type ColorProps = InputProps<AdditionalColorProps>;
