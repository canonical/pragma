/**
 * MCP tool specs for the create domain.
 *
 * Compiled from the bundled generator packs — one `create_<noun>` tool per
 * generator noun — rather than hand-written per generator.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import bundledGeneratorPacks from "../generatorPack/bundled.js";

const specs: readonly ToolSpec[] = bundledGeneratorPacks().specs;

export default specs;
