/**
 * Adapter: ToolSpec → server.registerTool().
 *
 * Converts declarative domain-owned ToolSpecs into registered MCP tools.
 * This is the single point where ToolSpec meets MCP infrastructure —
 * zod schema generation, wrapTool envelope, and server registration.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type { ToolParamDef, ToolSpec } from "../../domains/shared/ToolSpec.js";
import type { ToolPayload } from "../types.js";
import { wrapTool } from "../utils/index.js";

/**
 * Convert a ToolParamDef record to a zod object schema.
 */
function buildZodSchema(
  params: Readonly<Record<string, ToolParamDef>>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [name, def] of Object.entries(params)) {
    let field: z.ZodTypeAny;

    switch (def.type) {
      case "boolean":
        field = z.boolean();
        break;
      case "string[]":
        field = z.array(z.string());
        break;
      case "string":
        field = def.enum
          ? z.enum(def.enum as [string, ...string[]])
          : z.string();
        break;
    }

    if (def.description) {
      field = field.describe(def.description);
    }
    if (def.optional !== false) {
      field = field.optional();
    }

    shape[name] = field;
  }

  return z.object(shape);
}

/**
 * Register a single ToolSpec on the MCP server.
 */
export default function registerFromSpec(
  server: McpServer,
  runtime: PragmaRuntime,
  spec: ToolSpec,
): void {
  const toolConfig: {
    description: string;
    inputSchema?: z.ZodObject<Record<string, z.ZodTypeAny>>;
    annotations: {
      readOnlyHint: boolean;
      destructiveHint?: boolean;
      openWorldHint: boolean;
    };
  } = {
    description: spec.description,
    annotations: {
      readOnlyHint: spec.readOnly,
      openWorldHint: false,
    },
  };

  if (spec.params && Object.keys(spec.params).length > 0) {
    toolConfig.inputSchema = buildZodSchema(spec.params);
  }

  if (spec.destructive !== undefined) {
    toolConfig.annotations.destructiveHint = spec.destructive;
  }

  server.registerTool(
    spec.name,
    toolConfig,
    wrapTool(
      runtime,
      spec.execute as (
        rt: PragmaRuntime,
        params: Record<string, unknown>,
      ) => Promise<ToolPayload>,
    ),
  );
}
