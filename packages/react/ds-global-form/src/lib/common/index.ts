// Field-composition machinery (not an ontology tier). Any tier may depend on
// `common/` downward; `common/` never depends on a tier.
export { default as bindField } from "./bindField/index.js";
export * from "./types.js";
export * from "./Wrapper/index.js";
