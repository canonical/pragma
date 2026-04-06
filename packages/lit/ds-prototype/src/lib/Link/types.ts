export interface LinkProps {
  /** URL the link points to. */
  href?: string;
  /**
   * Visual variant.
   * - `default`: plain underlined link.
   * - `primary`: constructive (green) button-styled anchor.
   * - `secondary`: default button-styled anchor (border, no fill).
   * @default "default"
   */
  variant?: "default" | "primary" | "secondary";
  /** Equivalent to the native `target` attribute on `<a>`. */
  target?: string;
  /** Accessible label when slot content is not descriptive. */
  ariaLabel?: string | null;
}

export default LinkProps;
