/**
 * The machinery the standalone parts and the composition share, outside
 * any ontology tier: the cell context a table installs and a column's own
 * renderer reads, and the contract a virtualization descriptor carries
 * between the table and the entry point that writes it. Any tier may depend
 * on `common/` downward; `common/` never depends on a tier.
 */

export * from "./CellContext/index.js";
export * from "./virtualization/index.js";
