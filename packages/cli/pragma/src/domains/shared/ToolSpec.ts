/**
 * Declarative MCP tool specification — no MCP imports.
 *
 * Domains export `ToolSpec[]` from `mcp/specs.ts`. The `mcp/` adapter layer
 * consumes specs via `registerFromSpec()` to wire zod schemas, wrapTool
 * envelopes, and `server.registerTool()` calls.
 */

import type { PragmaRuntime } from "./runtime.js";

/**
 * Parameter definition for a tool — neutral format.
 *
 * The MCP adapter generates zod schemas from this. A future CLI adapter
 * could generate `ParameterDefinition[]`.
 */
export interface ToolParamDef {
  readonly type: "string" | "boolean" | "string[]";
  readonly description: string;
  readonly optional?: boolean;
  readonly enum?: readonly string[];
}

/**
 * Return value from a tool spec's execute function.
 *
 * Structurally compatible with `ToolPayload` from `mcp/types.ts`.
 */
export type ToolResult =
  | { data: unknown; meta?: Record<string, unknown> }
  | { condensed: true; text: string; tokens: string };

/**
 * Declarative tool specification — no MCP imports.
 *
 * Domains export arrays of these. The `mcp/tools/registerFromSpec.ts`
 * adapter converts each spec into a registered MCP tool.
 */
export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly params?: Readonly<Record<string, ToolParamDef>>;
  readonly readOnly: boolean;
  readonly destructive?: boolean;
  readonly execute: (
    rt: PragmaRuntime,
    params: Record<string, unknown>,
  ) => Promise<ToolResult>;
}
