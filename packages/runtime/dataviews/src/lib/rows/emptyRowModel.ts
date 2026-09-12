import type { RowModel } from "./types.js";

/**
 * The model of no rows. A model with no records holds no identities and no
 * records to carry, so every empty collection can share this one.
 */
const EMPTY_ROW_MODEL: RowModel<never> = Object.freeze({
  entries: Object.freeze([]),
  ids: Object.freeze([]),
  byId: () => undefined,
});

export default EMPTY_ROW_MODEL;
