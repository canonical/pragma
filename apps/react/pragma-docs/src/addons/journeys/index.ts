// =============================================================================
// JOURNEYS — a pragma-SPECIFIC ADD-ON, not a core lens.
//
// WHAT THIS DIRECTORY IS. `src/addons/**` holds views that only work against
// pragma's own graph. It is not `src/domains/lenses/**`, and the difference is
// the whole point: the lens tree is the CORE lens set, and everything in it
// must execute against any provider that implements
// @canonical/prism-contract. This does not, and cannot.
//
// WHY IT CANNOT. `JourneysExplorerQuery` joins four ontology-derived root
// fields (`jobs`, `pairings`, `personas`, `job`) and walks eleven
// ontology-derived properties. The contract exposes an entity's class and that
// class's SCHEMA — `EntityMeta.field(name:)` answers with CARDINALITY
// METADATA, not with a value — and no contract field anywhere returns the
// value of an arbitrary property on an arbitrary entity. Generic
// instance-level relation traversal is all this lens is, so there is no
// rewrite of the operation that makes it neutral. Only a contract that grew
// generic reflection could, and that is not on the table.
//
// WHY IT MOVED HERE. An owner decision, recorded verbatim: "keep it on side
// for now, it will be an add-on plugin not a core view." The relocation
// follows the RECLASSIFICATION; it is not a way of getting a red gate to look
// green. Read `packages/docsite/graph-example/src/testing/integration/
// lensOperations.test.ts` before concluding otherwise — moving any operation
// that is still meant to be core out of the lens tree is expressly forbidden
// there, and remains so.
//
// WHAT HAPPENS NEXT. This is expected to become a PLUGIN once the docsite has
// a plugin mechanism: an add-on that registers its own routes, rail entry and
// strip claims from outside the app's route table, rather than being wired
// into `src/routes.tsx` by hand as it is today. Until that mechanism exists
// the code stays here, wired by hand, fully working and fully tested. It is
// on side, not switched off.
// =============================================================================

export * from "./JourneyInspector/index.js";
export * from "./JourneyRail/index.js";
export * from "./JourneysExplorer/index.js";
export * from "./JourneysPage/index.js";
export * from "./JourneyTable/index.js";
export * from "./JourneyWell/index.js";
