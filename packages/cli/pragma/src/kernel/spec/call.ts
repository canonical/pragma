/**
 * A call: one verb plus the params to make it with — the single type behind
 * every example and every recovery.
 *
 * An author names the call ONCE and both spellings derive from it:
 * `token_lookup { name: ["color.text"] }` for an agent on MCP,
 * `pragma token lookup color.text` for a person at a terminal. A hand-typed
 * pair can disagree, and a hand-typed string cannot be checked against the
 * verb it names, where a call can (`capabilities/callRule.test.ts`).
 *
 * The CLI spelling needs facts the call does not carry — which params are
 * positional, which booleans default to true, whether the verb mutates. They
 * live on the verb, so the projectors declare their verbs here as they boot
 * ({@link declareVerbs}). A call naming a verb nobody declared renders every
 * param as a flag rather than throwing: this runs inside error rendering,
 * where a second failure helps no one.
 *
 * NOT derivable here: a noun whose CLI is mounted by its own projection
 * (`create`, whose commands carry a generator segment the verb's params do
 * not). Its calls spell correctly as tool calls only.
 *
 * Zod-free: it is reachable from the `--help` path.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { kebabCase, toolName } from "./emitSurface.js";
import type { Call, Surface, VerbSpec } from "./types.js";

const declared = new Map<string, VerbSpec>();
let findProblem:
  | ((call: Call, verb: VerbSpec | undefined) => string | undefined)
  | undefined;

/**
 * Declare the verbs a call may name. Additive, so a fixture's verbs join the
 * distribution's rather than replacing them.
 *
 * @note Impure — fills the module-level index {@link renderCall} reads. A call
 *   is rendered deep inside error construction and formatters, which hold no
 *   registry to pass in.
 */
export function declareVerbs(verbs: readonly VerbSpec[]): void {
  for (const verb of verbs) declared.set(verb.path.join(" "), verb);
}

/**
 * Make every rendered call prove itself. The test setup installs the ONE
 * validator — the verb's real MCP input schema — so a recovery built on any
 * line a test runs is checked exactly as the conformance test checks examples.
 * It is handed the DECLARED verb the call names, so a fixture that declares its
 * verbs is held to them too.
 *
 * @note Impure — sets module-level state; never installed in a shipped process.
 */
export function checkCallsWith(
  validator: (call: Call, verb: VerbSpec | undefined) => string | undefined,
): void {
  findProblem = validator;
}

/** The tool name a call addresses (`"sources update"` → `sources_update`). */
function callToolName(call: Call): string {
  return toolName(call.verb.split(" ") as [string, string?]);
}

/**
 * The call as the NEXT STEP of a dead end. A mutating tool is plan-first over
 * MCP, so a hint that means "do this" carries `confirm: true` — following it
 * does the thing instead of returning a plan. An example never does: it shows
 * the call, and the plan-first convention is the instructions' to teach.
 */
function asNextStep(call: Call): Call {
  return declared.get(call.verb)?.capability.mutates
    ? { ...call, params: { ...call.params, confirm: true } }
    : call;
}

/** The MCP tool a recovery names, or nothing when its verb is withheld from MCP. */
export function callTool(
  call: Call,
): { tool: string; params: Record<string, unknown> } | undefined {
  if (declared.get(call.verb)?.capability.mcp.expose === false) {
    return undefined;
  }
  return { tool: callToolName(call), params: { ...asNextStep(call).params } };
}

/** Quote a CLI word unless the shell would read it bare. */
function quoteWord(value: unknown): string {
  const word = String(value);
  return /^[\w.:/@=,+-]+$/.test(word)
    ? word
    : `'${word.replaceAll("'", "'\\''")}'`;
}

/** The CLI spelling: global flags, then flags, then positionals in the verb's order. */
function renderCliCall(call: Call): string {
  const params = call.params ?? {};
  const specs = declared.get(call.verb)?.params ?? [];
  const positional = specs.filter((p) => p.positional).map((p) => p.name);
  const flags: string[] = [];
  for (const [name, value] of Object.entries(params)) {
    // `confirm` is MCP's plan-first gate; the CLI has no such flag.
    if (positional.includes(name) || value === undefined || name === "confirm")
      continue;
    const flag = `--${kebabCase(name)}`;
    if (typeof value === "boolean") {
      const spec = specs.find((p) => p.name === name);
      const defaultsTrue = spec?.kind === "boolean" && spec.default === true;
      if (value) flags.push(flag);
      else if (defaultsTrue) flags.push(`--no-${kebabCase(name)}`);
      continue;
    }
    // A list-valued flag is repeated, one value each.
    for (const item of [value].flat()) flags.push(`${flag} ${quoteWord(item)}`);
  }
  const words = positional
    .filter((name) => params[name] !== undefined)
    .flatMap((name) => [params[name]].flat().map(quoteWord));
  // A positional that looks like a flag needs the end-of-options marker.
  const guard = words.some((word) => word.startsWith("-")) ? ["--"] : [];
  return [
    `${RECOVERY_CLI_PREFIX}${call.verb}`,
    ...(call.cliFlags ?? []),
    ...flags,
    ...guard,
    ...words,
  ].join(" ");
}

/** The MCP spelling: the tool name and its argument bag. */
function renderMcpCall(call: Call): string {
  const body = Object.entries(call.params ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
    .join(", ");
  return `${callToolName(call)} ${body ? `{ ${body} }` : "{}"}`;
}

/**
 * Spell a call for the surface it is about to be printed on.
 *
 * @param call - The verb and params to make.
 * @param surface - `"cli"` for a command line, `"mcp"` for a tool call.
 * @returns `pragma token lookup color.text`, or `token_lookup { name: ["color.text"] }`.
 * @throws Error when a validator is installed (tests only) and rejects the call.
 */
export function renderCall(call: Call, surface: Surface): string {
  const problem = findProblem?.(call, declared.get(call.verb));
  if (problem) throw new Error(`Unsound call ${call.verb}: ${problem}`);
  return spellingFor(call, surface) === "mcp"
    ? renderMcpCall(call)
    : renderCliCall(call);
}

/**
 * A verb withheld from MCP has no tool to name, so even over MCP it is spelled
 * as the command it is — something an agent can hand to its user.
 */
function spellingFor(call: Call, surface: Surface): Surface {
  return declared.get(call.verb)?.capability.mcp.expose === false
    ? "cli"
    : surface;
}

/**
 * One argument, quoted as code, in the surface's own spelling: `--tier all` on
 * the CLI, `tier: "all"` over MCP. For the sentences that name an argument to
 * change rather than a whole call to make.
 */
export function quoteArgument(
  name: string,
  value: string | number,
  surface: Surface,
): string {
  return surface === "mcp"
    ? `\`${name}: ${JSON.stringify(value)}\``
    : `\`--${kebabCase(name)} ${value}\``;
}

/** A call quoted as code; one containing a backtick takes the doubled fence. */
export function quoteCall(call: Call, surface: Surface): string {
  const text = renderCall(call, surface);
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
}

/** The sentence that ends a dead end: the exact next call, for this surface. */
export function renderNextStep(call: Call, surface: Surface): string {
  return spellingFor(call, surface) === "mcp"
    ? `Call ${quoteCall(asNextStep(call), surface)}.`
    : `Run ${quoteCall(call, surface)}.`;
}
