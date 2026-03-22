import pkg from "../package.json" with { type: "json" };
import { PREFIX_MAP } from "./domains/shared/prefixes.js";

const PROGRAM_NAME = "pragma";
const PROGRAM_DESCRIPTION = "CLI and MCP server for Canonical's design system.";
const VERSION = pkg.version;

const VALID_CHANNELS = ["normal", "experimental", "prerelease"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

/**
 * Per-namespace property URIs for semantically equivalent fields.
 * Each ontology uses different property names for the same concept
 * (name/label, description/summary/comment).
 */
interface OntologyPropertyMap {
  readonly label: string;
  readonly description?: string;
  readonly definition?: string;
}

/**
 * Maps namespace prefix → property URIs for human-readable label and
 * description. Used by MCP resource handlers and domain operations to
 * resolve cross-ontology properties uniformly.
 *
 * @see F.04 OP.05
 */
const PROPERTY_MAP: Record<string, OntologyPropertyMap> = {
  ds: {
    label: `${PREFIX_MAP.ds}name`,
    description: `${PREFIX_MAP.ds}summary`,
    definition: `${PREFIX_MAP.ds}definition`,
  },
  cs: {
    label: `${PREFIX_MAP.cs}name`,
    description: `${PREFIX_MAP.cs}description`,
    definition: `${PREFIX_MAP.cs}definition`,
  },
  rdfs: {
    label: `${PREFIX_MAP.rdfs}label`,
    description: `${PREFIX_MAP.rdfs}comment`,
  },
  owl: {
    label: `${PREFIX_MAP.rdfs}label`,
    description: `${PREFIX_MAP.rdfs}comment`,
  },
  skos: {
    label: `${PREFIX_MAP.skos}prefLabel`,
    definition: `${PREFIX_MAP.skos}definition`,
  },
  anatomy: {
    label: `${PREFIX_MAP.ds}name`,
  },
};

export {
  PROGRAM_DESCRIPTION,
  PROGRAM_NAME,
  PROPERTY_MAP,
  VALID_CHANNELS,
  VERSION,
};
export type { Channel, OntologyPropertyMap };
