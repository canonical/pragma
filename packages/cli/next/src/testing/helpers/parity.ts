/**
 * Uniform CLI-json == MCP-json parity asserter.
 *
 * v2's MCP envelope IS the CLI `--format json` `{ ok, data, meta }` envelope —
 * both projectors build it from the SAME `successEnvelope`/`errorEnvelope`
 * (`kernel/render/envelope.ts` via `kernel/project/mcp/envelope.ts`). There is
 * no separate condensed/text/tokens MCP shape in v2 (confirmed:
 * `mcp/envelope.ts` reuses the CLI's envelope builders verbatim), so parity
 * simplifies to structural data-equality — no byte-exact `condensed ===
 * fmt.llm(...)` comparison to reproduce. This generalizes the pattern already
 * proven ad hoc in `mcp/parity.test.ts` (`probe echo`) and `sources.test.ts`
 * (`sources status`) into one reusable helper every read noun's tests drive.
 */

import { expect } from "vitest";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "./projectMcp.js";

/** `--format json`, plain (non-agent) global flags. */
export const JSON_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};

/** No dry-run/undo/confirm — the shape every read verb ignores. */
export const NO_MUTATION = { dryRun: false, undo: false, yes: false } as const;

/** One CLI-vs-MCP parity check. */
export interface ParityCase {
  /** The modules to project on the MCP side (must include `verb`'s module). */
  readonly modules: readonly CapabilityModule[];
  /** The verb to dispatch on the CLI side. */
  readonly verb: VerbSpec;
  /** The MCP tool name (`kernel/spec/emitSurface.ts#toolName(verb.path)`). */
  readonly tool: string;
  /** The working directory both surfaces resolve config/store from. */
  readonly cwd: string;
  /**
   * The param bag — passed to `executeVerb` AS the coerced CLI params, and to
   * `mcp.callTool` AS the tool arguments. Valid because both dispatch paths
   * key off the same `VerbSpec.params` names (`dispatch.extractParams` /
   * `registerVerb.paramsFromArgs`), so one bag serves both surfaces.
   */
  readonly params?: Record<string, unknown>;
  /** Optional global-flag overrides (e.g. `{ detail: "detailed" }`) for the CLI side. */
  readonly flags?: Partial<GlobalFlags>;
}

/**
 * Run the same read through the CLI (`--format json`) and MCP, and assert the
 * two envelopes are deep-equal.
 *
 * @param opts - The verb, tool, cwd, and params to drive both surfaces with.
 * @returns The (shared) envelope, for further assertions.
 * @note Impure — dispatches a verb and spins up an in-process MCP server.
 */
export async function assertCliMcpParity(
  opts: ParityCase,
): Promise<Record<string, unknown>> {
  const params = opts.params ?? {};
  const runtime = bootRuntime({ ...JSON_FLAGS, ...opts.flags }, opts.cwd);
  const cli = await executeVerb(opts.verb, params, NO_MUTATION, runtime);
  const cliEnvelope = JSON.parse(cli.stdout as string) as Record<
    string,
    unknown
  >;

  const mcp = await projectMcp(opts.modules, opts.cwd);
  let mcpEnvelope: Record<string, unknown>;
  try {
    const toolArgs = opts.flags?.detail
      ? { ...params, detail: opts.flags.detail }
      : params;
    mcpEnvelope = await mcp.callTool(opts.tool, toolArgs);
  } finally {
    await mcp.cleanup();
  }

  expect(cliEnvelope).toEqual(mcpEnvelope);
  return cliEnvelope;
}
