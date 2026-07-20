/**
 * Create-capability types with NO summon-core / generator import, so a module
 * that only needs `CreateKind` (e.g. `create.verb`) does not drag
 * `pickGenerator` — and its heavy generator imports — into the static graph.
 */

/** The three `create` nouns (path capped at two segments). */
export type CreateKind = "component" | "package" | "application";
