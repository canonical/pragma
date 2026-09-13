/**
 * The key a column's width is kept under in the collection's saved
 * presentation. Named for the renderer, so another renderer's arrangement
 * never reads a table's widths as its own.
 */
export default function spellWidthKey(id: string): string {
  return `table.width.${id}`;
}
