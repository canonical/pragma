/**
 * Adapter: {@link VerbSpec} → an MCP tool.
 *
 * This is the one seam where the grammar meets the MCP SDK — the only place a
 * projector reaches for zod (to build the input schema the SDK validates). The
 * tool name follows the grammar's naming rule, annotations derive from the
 * capability, and a mutating verb gains the plan-first `confirm` flow: without
 * `confirm`, the verb's `Task` is dry-run and a plan is returned
 * (`{ planOnly: true, confirmRequired: true }`); with `confirm: true`, it runs
 * for real.
 */

import { describeEffect, dryRun, type Task } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PragmaError } from "../../error/PragmaError.js";
import type { PragmaRuntime } from "../../runtime/types.js";
import { toolName } from "../../spec/emitSurface.js";
import type { McpAnnotations, ParamSpec, VerbSpec } from "../../spec/types.js";
import { toolError, toolSuccess } from "./envelope.js";

/** The base zod type for a param, before `.describe()`/`.optional()`. */
function zodForParam(param: ParamSpec): z.ZodTypeAny {
  switch (param.kind) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "enum":
      return z.enum(param.values as unknown as [string, ...string[]]);
    case "string[]":
      return z.array(z.string());
  }
}

/**
 * Build the zod input shape for a verb's params.
 *
 * Each param becomes a described field; non-required params are optional. The
 * returned raw shape is what the MCP SDK validates tool arguments against.
 *
 * @param params - The verb's parameter specs.
 * @returns A zod raw shape keyed by param name.
 */
export function buildZodSchema(params: readonly ParamSpec[]): z.ZodRawShape {
  const shape: z.ZodRawShape = {};
  for (const param of params) {
    let field = zodForParam(param);
    if (param.doc) field = field.describe(param.doc);
    // Apply a declared default so the MCP schema matches the CLI, which fills
    // ParamSpec.default when a flag is omitted (dispatch.extractParams).
    if ("default" in param && param.default !== undefined) {
      field = field.default(param.default);
    } else if (!param.required) {
      field = field.optional();
    }
    shape[param.name] = field;
  }
  return shape;
}

/** Derive the MCP annotations for a verb from its capability. */
function annotationsFor(verb: VerbSpec): McpAnnotations {
  return {
    readOnlyHint: !verb.capability.mutates,
    ...(verb.capability.destructive !== undefined
      ? { destructiveHint: verb.capability.destructive }
      : {}),
    openWorldHint: false,
  };
}

/** Pick just the verb's declared params out of the parsed tool arguments. */
function paramsFromArgs(
  verb: VerbSpec,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const param of verb.params) {
    if (param.name in args) params[param.name] = args[param.name];
  }
  return params;
}

/**
 * Coerce a thrown value into a {@link PragmaError} so the tool always returns
 * the `{ ok: false, error: { code, message } }` envelope — mirroring the CLI
 * dispatcher (dispatch.ts) so a non-PragmaError bug surfaces identically on both
 * surfaces rather than as a bare SDK error.
 */
function asPragmaError(error: unknown): PragmaError {
  return error instanceof PragmaError
    ? error
    : PragmaError.internalError(
        error instanceof Error ? error.message : String(error),
      );
}

/** The tool handler for a read verb: run, project, envelope. */
function readHandler(verb: VerbSpec, runtime: PragmaRuntime) {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    try {
      const params = paramsFromArgs(verb, args);
      const result = await Promise.resolve(
        verb.run(params, runtime) as Promise<unknown>,
      );
      return toolSuccess(JSON.parse(verb.output.formatters.json(result)));
    } catch (error) {
      return toolError(asPragmaError(error));
    }
  };
}

/** The tool handler for a mutating verb: plan-first unless `confirm: true`. */
function mutateHandler(verb: VerbSpec, runtime: PragmaRuntime) {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    try {
      const params = paramsFromArgs(verb, args);
      const task = verb.run(params, runtime) as Task<unknown>;
      if (args.confirm !== true) {
        const plan = dryRun(task).effects.map(describeEffect);
        return toolSuccess({ plan }, { planOnly: true, confirmRequired: true });
      }
      const result = await runTask(task);
      return toolSuccess(JSON.parse(verb.output.formatters.json(result)));
    } catch (error) {
      return toolError(asPragmaError(error));
    }
  };
}

/**
 * Register one exposed verb as an MCP tool on the server.
 *
 * @param server - The MCP server to register onto.
 * @param verb - The verb to expose (caller ensures `mcp.expose === true`).
 * @param runtime - The runtime handed to the verb's `run`.
 * @note Impure — mutates the server's tool registry.
 */
export function registerVerb(
  server: McpServer,
  verb: VerbSpec,
  runtime: PragmaRuntime,
): void {
  const shape = buildZodSchema(verb.params);
  if (verb.capability.mutates) {
    shape.confirm = z
      .boolean()
      .default(false)
      .describe("Set true to execute; otherwise a plan is returned.");
  }

  const config: {
    description: string;
    inputSchema?: z.ZodRawShape;
    annotations: McpAnnotations;
  } = {
    description: verb.summary,
    annotations: annotationsFor(verb),
  };
  if (Object.keys(shape).length > 0) config.inputSchema = shape;

  const handler = verb.capability.mutates
    ? mutateHandler(verb, runtime)
    : readHandler(verb, runtime);

  server.registerTool(
    toolName(verb.path),
    config,
    handler as Parameters<McpServer["registerTool"]>[2],
  );
}
