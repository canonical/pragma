/**
 * Prepend a stamp comment to file content: the stamp, a blank line, then the
 * content — the same byte shape {@link applyStamp} (the canonical runtime
 * stamping path) produces, so output does not depend on which helper a
 * caller reached for. Handles shebang lines (#!/...) by placing the stamp
 * after them, even when the shebang has no trailing newline yet.
 */
export default function prependStamp(content: string, stamp: string): string {
  if (content.startsWith("#!")) {
    const firstNewline = content.indexOf("\n");
    const end = firstNewline === -1 ? content.length : firstNewline + 1;
    const shebang = content.slice(0, end);
    const rest = content.slice(end);
    const separator = shebang.endsWith("\n") ? "" : "\n";
    return `${shebang}${separator}${stamp}\n\n${rest}`;
  }

  return `${stamp}\n\n${content}`;
}
