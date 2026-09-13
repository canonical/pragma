import { readField } from "../rows/index.js";

/**
 * Own-property read: the default field access for plain record rows. A row
 * that is not an object carries no field, rather than throwing at whichever
 * comparison reaches it first.
 */
export default function readProperty(row: unknown, field: string): unknown {
  return typeof row === "object" && row !== null
    ? readField(row, field)
    : undefined;
}
