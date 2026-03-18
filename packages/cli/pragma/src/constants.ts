import pkg from "../package.json" with { type: "json" };

const PROGRAM_NAME = "pragma";
const PROGRAM_DESCRIPTION = "CLI and MCP server for Canonical's design system.";
const VERSION = pkg.version;

const VALID_CHANNELS = ["normal", "experimental", "prerelease"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

export { PROGRAM_DESCRIPTION, PROGRAM_NAME, VALID_CHANNELS, VERSION };
export type { Channel };
