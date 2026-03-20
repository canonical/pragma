import pkg from "../package.json" with { type: "json" };

const PROGRAM_NAME = "pragma";
const PROGRAM_DESCRIPTION = "CLI and MCP server for Canonical's design system.";
const VERSION = pkg.version;

const VALID_CHANNELS = ["normal", "experimental", "prerelease"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

/**
 * Maps namespace prefix → property URI used to fetch a human-readable label
 * for instances in that namespace. Used by MCP resource handlers to resolve
 * level-1 object relations to summaries.
 */
const LABEL_PROPERTY: Record<string, string> = {
  ds: "https://ds.canonical.com/name",
  cs: "http://pragma.canonical.com/codestandards#name",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#label",
  owl: "http://www.w3.org/2000/01/rdf-schema#label",
};

export {
  LABEL_PROPERTY,
  PROGRAM_DESCRIPTION,
  PROGRAM_NAME,
  VALID_CHANNELS,
  VERSION,
};
export type { Channel };
