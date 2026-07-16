/**
 * Create domain — generator-pack-driven `create <noun>` commands.
 *
 * The create surface is compiled from bundled generator packs (a package's
 * `generators` export), not hardcoded per generator. Every generator each
 * bundled package ships is exposed as a `create <noun>` command and a
 * `create_<noun>` MCP tool. See {@link ./generatorPack/compileGeneratorPack}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import bundledGeneratorPacks from "./generatorPack/bundled.js";

/**
 * Return all create command definitions, compiled from the bundled
 * generator packs.
 */
export function commands(): readonly CommandDefinition[] {
  return bundledGeneratorPacks().commands;
}

export { specs as mcpSpecs } from "./mcp/index.js";
