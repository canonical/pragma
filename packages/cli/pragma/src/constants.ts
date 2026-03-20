import pkg from "../package.json" with { type: "json" };
import { PREFIX_MAP } from "./domains/shared/prefixes.js";

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
  ds: `${PREFIX_MAP.ds}name`,
  cs: `${PREFIX_MAP.cs}name`,
  rdfs: `${PREFIX_MAP.rdfs}label`,
  owl: `${PREFIX_MAP.rdfs}label`,
};

export {
  LABEL_PROPERTY,
  PROGRAM_DESCRIPTION,
  PROGRAM_NAME,
  VALID_CHANNELS,
  VERSION,
};
export type { Channel };
