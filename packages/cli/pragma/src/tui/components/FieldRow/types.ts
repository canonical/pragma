export interface FieldRowProps {
  /** Field label (rendered bold, fixed-width). */
  readonly label: string;
  /** Field value (rendered after the label). */
  readonly value: string;
  /** Label column width for alignment across rows. */
  readonly labelWidth: number;
  /** Optional chalk color name for the value text. */
  readonly valueColor?: string;
}
