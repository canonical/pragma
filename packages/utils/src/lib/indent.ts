/**
 * Indent every line of a string by a given number of spaces.
 *
 * @example
 * indent("a\nb", 2) // "  a\n  b"
 */
export default function indent(str: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return str
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}
