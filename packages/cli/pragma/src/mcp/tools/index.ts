/**
 * MCP tool registration orchestrator.
 *
 * Delegates to domain-specific registration modules.
 *
 * @see F.06 RS.06, F.02 NM.02, F.03 SF
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { registerComponentTools } from "./component.js";
import { registerConfigTools } from "./config.js";
import { registerDiagnosticTools } from "./diagnostics.js";
import { registerGeneratorTools } from "./generators.js";
import { registerGraphTools } from "./graph.js";
import { registerModifierTools } from "./modifier.js";
import { registerOntologyTools } from "./ontology.js";
import { registerOrientationTools } from "./orientation.js";
import { registerSkillTools } from "./skill.js";
import { registerStandardTools } from "./standard.js";
import { registerTierTools } from "./tier.js";
import { registerTokenTools } from "./token.js";

/**
 * Register all MCP tools on the server.
 */
export default function registerAllTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  registerComponentTools(server, runtime);
  registerStandardTools(server, runtime);
  registerModifierTools(server, runtime);
  registerTokenTools(server, runtime);
  registerTierTools(server, runtime);
  registerConfigTools(server, runtime);
  registerOntologyTools(server, runtime);
  registerGraphTools(server, runtime);
  registerSkillTools(server, runtime);
  registerDiagnosticTools(server, runtime);
  registerOrientationTools(server, runtime);
  registerGeneratorTools(server, runtime);
}
