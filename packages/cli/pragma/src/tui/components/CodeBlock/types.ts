export interface CodeBlockProps {
  /** Raw code string to display. */
  readonly code: string;
  /** Language identifier for syntax coloring ("yaml", "ttl", "text"). */
  readonly language: string;
}
