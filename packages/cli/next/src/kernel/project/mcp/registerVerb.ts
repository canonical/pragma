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

import { statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { describeEffect, dryRun, type Task } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { asPragmaError } from "../../error/fromTaskError.js";
import { PragmaError } from "../../error/PragmaError.js";
import type { InteractionRuntime, PragmaRuntime } from "../../runtime/types.js";
import { toolName } from "../../spec/emitSurface.js";
import type { McpAnnotations, ParamSpec, VerbSpec } from "../../spec/types.js";
import { toolError, toolSuccess } from "./envelope.js";

/**
 * Resolve the effective per-call write root for a mutating tool call.
 *
 * The MCP-only injected `cwd` arg lets an agent target a project directory other
 * than the server's launch dir. It MUST be an absolute, existing directory —
 * this is the SINGLE cwd the SEC-2 jail validates AND the interpreter resolves
 * effect paths against, so a write dir the jail never checked can never exist.
 *
 * @throws PragmaError INVALID_INPUT for a relative or non-directory `cwd`.
 */
function resolveEffectiveCwd(rawCwd: unknown, fallback: string): string {
  if (typeof rawCwd !== "string" || rawCwd === "") return fallback;
  if (!isAbsolute(rawCwd)) {
    throw PragmaError.invalidInput("cwd", rawCwd, {
      recovery: { message: "Provide an absolute project directory path." },
    });
  }
  let isDir = false;
  try {
    isDir = statSync(rawCwd).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    throw PragmaError.invalidInput("cwd", rawCwd, {
      recovery: { message: "The cwd must be an existing directory." },
    });
  }
  return rawCwd;
}

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
 * Apply the injected `detail` argument to a per-call runtime.
 *
 * A verb with a {@link DisclosureSpec} gains a `detail` enum tool param (see
 * {@link registerVerb}); when the agent sets it, this seeds `globalFlags.detail`
 * for THIS call so the verb's `run` resolves the level through the same uniform
 * `resolveDetail` the CLI `--detail` flag feeds — no VerbSpec field, no
 * Formatters-signature change, no MCP-opts-out asymmetry.
 */
function withDetail(
  verb: VerbSpec,
  runtime: PragmaRuntime,
  args: Record<string, unknown>,
): PragmaRuntime {
  if (!verb.disclosure || typeof args.detail !== "string") return runtime;
  return {
    ...runtime,
    globalFlags: { ...runtime.globalFlags, detail: args.detail as never },
  };
}

/** The tool handler for a read verb: run, project, envelope. */
function readHandler(verb: VerbSpec, runtime: PragmaRuntime) {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    try {
      if (verb.capability.needsStore) await runtime.store.get();
      const params = paramsFromArgs(verb, args);
      const result = await Promise.resolve(
        verb.run(params, withDetail(verb, runtime, args)) as Promise<unknown>,
      );
      return toolSuccess(JSON.parse(verb.output.formatters.json(result)));
    } catch (error) {
      return toolError(asPragmaError(error));
    }
  };
}

/**
 * Route a Task's log effects to STDERR. The default interpreter logs to
 * `console.log` (stdout), which would corrupt the MCP stdio JSON-RPC frame;
 * diagnostics belong on stderr. Mirrors the CLI dispatcher's `logToStderr`.
 */
const logToStderr = (_level: string, message: string): void => {
  process.stderr.write(`${message}\n`);
};

/** The tool handler for a mutating verb: plan-first unless `confirm: true`. */
function mutateHandler(verb: VerbSpec, runtime: PragmaRuntime) {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    try {
      // The SINGLE per-call write root: validated here (absolute + existing dir)
      // and threaded as `rt.cwd`, so the SEC-2 jail and the interpreter's
      // effect-path base are literally the same value — no jail bypass.
      const effectiveCwd = resolveEffectiveCwd(args.cwd, runtime.cwd);
      if (verb.capability.needsStore) await runtime.store.get();
      const params = paramsFromArgs(verb, args);
      // Without `confirm`, this is a plan-only preview: tell the verb so a
      // network-touching mutation stays offline and never fetches on discovery.
      const preview = args.confirm !== true;
      // MCP has no interactive channel: transport "mcp" makes an interactive
      // verb pick the params-or-error prompt strategy, so a tool call can never
      // hang waiting for input.
      const interaction: InteractionRuntime = {
        isTTY: false,
        transport: "mcp",
        yes: args.confirm === true,
      };
      const mutationRuntime: PragmaRuntime = {
        ...runtime,
        cwd: effectiveCwd,
        mutation: { preview },
        interaction,
      };
      const task = await Promise.resolve(
        verb.run(params, mutationRuntime) as
          | Task<unknown>
          | Promise<Task<unknown>>,
      );
      if (preview) {
        const plan = dryRun(task)
          .effects.filter((effect) => effect._tag !== "Prompt")
          .map(describeEffect);
        return toolSuccess({ plan }, { planOnly: true, confirmRequired: true });
      }
      // Real execution: spread the verb's runner options (prompt handler,
      // stamping) into the interpreter; run teardown afterwards.
      const exec = mutationRuntime.exec ?? {};
      try {
        const result = await runTask(task, { onLog: logToStderr, ...exec });
        return toolSuccess(JSON.parse(verb.output.formatters.json(result)));
      } finally {
        await exec.dispose?.();
        // A real mutation may have changed the pack/config on disk. This runtime
        // is booted ONCE for the whole server lifetime and shared by every tool,
        // so drop its server-lifetime caches (store session + the config memo the
        // boot depends on) — the next read re-boots against the new state instead
        // of serving a stale pack/config. `mutationRuntime` spreads `runtime`, so
        // this is the same shared LazyStore. Only reached on the real-run branch
        // (`confirm: true`); the plan-only preview above never touches disk.
        runtime.store.invalidate();
      }
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
  // A verb with progressive disclosure gains a `detail` enum param derived from
  // its DisclosureSpec (Risk2 — NO new VerbSpec field). The handler seeds
  // globalFlags.detail from it per call, so MCP and CLI share one resolveDetail.
  if (verb.disclosure) {
    shape.detail = z
      .enum(verb.disclosure.levels as unknown as [string, ...string[]])
      .optional()
      .describe(
        `Progressive-disclosure level (${verb.disclosure.levels.join(", ")}); default ${verb.disclosure.default}.`,
      );
  }
  if (verb.capability.mutates) {
    shape.confirm = z
      .boolean()
      .default(false)
      .describe("Set true to execute; otherwise a plan is returned.");
    // Injected MCP-only per-call write root — added to the zod shape but NOT to
    // verb.params (like `confirm`/`detail`), so `emitVerb` never emits it and the
    // surface golden is untouched. The handler validates it and threads it as the
    // single `rt.cwd` the jail + interpreter share (SEC-2 atomicity).
    shape.cwd = z
      .string()
      .optional()
      .describe(
        "Absolute project directory to write into; defaults to the server's working directory.",
      );
  }

  const config: {
    description: string;
    inputSchema?: z.ZodRawShape;
    annotations: McpAnnotations;
  } = {
    // The agent-facing tool description is the verb's richer `doc` when present
    // (pack `toolDescription`s compile into it; hand-written verbs author it
    // directly), falling back to the one-line `summary`. Tool descriptions are
    // NOT part of the frozen surface, so this stays covenant-safe.
    description: verb.doc ?? verb.summary,
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
