/**
 * Adapter: ToolSpec → server.registerTool().
 *
 * Converts declarative domain-owned ToolSpecs into registered MCP tools.
 * This is the single point where ToolSpec meets MCP infrastructure —
 * zod schema generation, wrapTool envelope, and server registration.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
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
      case "record":
        field = z.record(z.string());
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
 * Build the wire `annotations` object for a spec.
 *
 * Shared by `registerFromSpec` and `buildToolListEntry` so the key
 * INSERTION ORDER is identical on both paths — the SDK serves the
 * registered object verbatim, so a second construction with a different
 * order would break the byte-identity the mirror invariant promises.
 */
function buildAnnotations(spec: ToolSpec): ToolListEntry["annotations"] {
  return {
    readOnlyHint: spec.readOnly,
    ...(spec.destructive !== undefined
      ? { destructiveHint: spec.destructive }
      : {}),
    openWorldHint: false,
  };
}

/** One `tools/list` entry, as the MCP SDK serializes it. */
export interface ToolListEntry {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations: {
    readonly readOnlyHint: boolean;
    readonly destructiveHint?: boolean;
    readonly openWorldHint: boolean;
  };
  /** SDK-stamped: `registerTool` hardcodes `taskSupport: "forbidden"`. */
  readonly execution: { readonly taskSupport: "forbidden" };
}

/**
 * Project a ToolSpec onto its `tools/list` entry.
 *
 * THE MIRROR INVARIANT: this must serialize byte-identically to what the
 * SDK serves for the registered tool. It therefore runs the SAME zod
 * schema build `registerFromSpec` hands the server, through the SAME
 * `zod-to-json-schema` conversion (and options) the SDK applies for zod
 * v3 schemas, with the SDK's empty-object fallback. Do not hand-roll a
 * second JSON-schema writer here — the parity suite is the referee.
 *
 * @param spec - The declarative tool spec.
 * @returns The `tools/list` entry the server would serve for it.
 */
export function buildToolListEntry(spec: ToolSpec): ToolListEntry {
  const zodSchema =
    spec.params && Object.keys(spec.params).length > 0
      ? buildZodSchema(spec.params)
      : undefined;
  const inputSchema = zodSchema
    ? (zodToJsonSchema(zodSchema, {
        strictUnions: true,
        pipeStrategy: "input",
      }) as Record<string, unknown>)
    : { type: "object", properties: {} };

  return {
    name: spec.name,
    description: spec.description,
    inputSchema,
    annotations: buildAnnotations(spec),
    execution: { taskSupport: "forbidden" },
  };
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
    annotations: ToolListEntry["annotations"];
  } = {
    description: spec.description,
    annotations: buildAnnotations(spec),
  };

  if (spec.params && Object.keys(spec.params).length > 0) {
    toolConfig.inputSchema = buildZodSchema(spec.params);
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
