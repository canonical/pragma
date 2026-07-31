import type { CREATE_GENERATORS } from "./constants.js";

/**
 * The `create` nouns — one per declared generator binding (path capped at two
 * segments). Derived from {@link CREATE_GENERATORS} so the union cannot drift
 * from the bindings.
 *
 * Deliberately free of any summon-core / generator import, so a module that only
 * needs this type (e.g. `create.verb`) does not drag `pickGenerator` — and its
 * heavy generator imports — into the static graph.
 */
export type CreateKind = keyof typeof CREATE_GENERATORS;
