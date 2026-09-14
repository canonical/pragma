import { WIDTH_KEY_PREFIX } from "./constants.js";

/** The key a column's width is kept under in the collection's presentation. */
export default function spellWidthKey(id: string): string {
  return `${WIDTH_KEY_PREFIX}${id}`;
}
