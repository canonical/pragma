/**
 * The machinery the standalone parts and the composition share, outside
 * any ontology tier: the announcer a root speaks through, the cell context a
 * table installs and a column's own renderer reads, the field declaration
 * every renderer shows a record by, the words a table installs over its
 * private parts, the status a renderer shows above what it draws, the
 * settings menu a table installs in its settings cell and what it was given
 * as its settings reads, and the contract a virtualization descriptor
 * carries between the table and the entry point that writes it. Any tier may
 * depend on `common/` downward; `common/` never depends on a tier.
 */

export * from "./Announcer/index.js";
export * from "./CellContext/index.js";
export * from "./DisplayField/index.js";
export * from "./MessagesContext/index.js";
export * from "./SettingsMenuContext/index.js";
export * from "./virtualization/index.js";
