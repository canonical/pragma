/**
 * Prepend a stamp to file content.
 * Handles shebang lines (#!/...) by placing stamp after them.
 */
export default function prependStamp(content: string, stamp: string): string {
  if (content.startsWith("#!")) {
    const firstNewline = content.indexOf("\n");
    if (firstNewline !== -1) {
      const shebang = content.slice(0, firstNewline + 1);
      const rest = content.slice(firstNewline + 1);
      return `${shebang}${stamp}\n${rest}`;
    }
  }

  return `${stamp}\n${content}`;
}
