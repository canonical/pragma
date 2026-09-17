/**
 * A call: one verb plus the params to make it with — the single type behind
 * every example and every recovery.
 *
 * An author names the call ONCE, by verb path and param bag, and both spellings
 * derive from it: `token_lookup { name: ["color.text"] }` for an agent on MCP,
 * `pragma token lookup color.text` for a person at a terminal. Hand-typing the
 * two side by side is how they came to disagree — a CLI string quoting an
 * argument beside an MCP hint carrying none — and a hand-typed string cannot be
 * checked against the verb it names, where a call can (`callRule.test.ts`).
 *
 * The CLI spelling needs one fact the call does not carry: which params the
 * verb takes positionally. That lives on the verb, so the projectors declare
 * their verbs here as they boot ({@link declareVerbs}). A call naming a verb
 * nobody declared renders every param as a flag rather than throwing, because
 * this runs inside error rendering, where a second failure helps no one.
 *
 * One spelling is NOT derivable here: a noun whose CLI is mounted by its own
 * projection (`create`, whose commands carry a generator segment the verb's
 * params do not). Its calls spell correctly as tool calls only; nothing renders
 * one as a command today.
 *
 * Zod-free: it is reachable from the `--help` path.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { kebabCase } from "./emitSurface.js";
import type { VerbSpec } from "./types.js";

/** A verb path (`"sources update"`) and the params to call it with. */
export interface Call {
  readonly verb: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Where a call is about to be printed. */
export type Surface = "cli" | "mcp";

const declared = new Map<string, VerbSpec>();
let checking = false;

/**
 * Declare the verbs a call may name. Additive, so a fixture's verbs join the
 * distribution's rather than replacing them.
 *
 * @param verbs - The verbs a projector is about to expose.
 * @note Impure — fills the module-level index {@link renderCall} reads. A call
 *   is rendered deep inside error construction and formatters, which hold no
 *   registry to pass in.
 */
export function declareVerbs(verbs: readonly VerbSpec[]): void {
  for (const verb of verbs) declared.set(verb.path.join(" "), verb);
}

/** Whether a verb path names a declared verb — a story may lack the verb a hint would name. */
export function isDeclaredVerb(verb: string): boolean {
  return declared.has(verb);
}

/**
 * Make every rendered call prove itself against the declared verbs. The test
 * setup turns this on, so a recovery built on any line a test runs is checked.
 *
 * @note Impure — flips module-level state; never enabled in a shipped process.
 */
export function enableCallChecking(): void {
  checking = true;
}

/**
 * Say what is wrong with a call, or nothing when it is sound: the verb is
 * declared, every param is one the verb declares, every required one is given.
 * Structural only — `callRule.test.ts` runs the statically known calls through
 * the verb's real MCP input schema.
 */
export function findCallProblem(call: Call): string | undefined {
  const verb = declared.get(call.verb);
  if (!verb) return `"${call.verb}" is not a declared verb`;
  const given = Object.keys(call.params ?? {});
  // `detail` is the one argument a projector adds that a call may carry: both
  // surfaces accept it on a verb with progressive disclosure.
  const accepted = [
    ...verb.params.map((param) => param.name),
    ...(verb.disclosure ? ["detail"] : []),
  ];
  const unknown = given.filter((name) => !accepted.includes(name));
  if (unknown.length > 0) {
    return `"${call.verb}" declares no param ${unknown.join(", ")}`;
  }
  const missing = verb.params
    .filter((param) => param.required && !given.includes(param.name))
    .map((param) => param.name);
  return missing.length > 0
    ? `"${call.verb}" requires ${missing.join(", ")}`
    : undefined;
}

/** Quote a CLI word unless the shell would read it bare. */
function quoteWord(value: unknown): string {
  const word = String(value);
  return /^[\w.:/@=,+-]+$/.test(word)
    ? word
    : `'${word.replaceAll("'", "'\\''")}'`;
}

/** The MCP tool a call addresses, or nothing when its verb is withheld from MCP. */
export function callTool(
  call: Call,
): { tool: string; params: Record<string, unknown> } | undefined {
  if (declared.get(call.verb)?.capability.mcp.expose === false) {
    return undefined;
  }
  return {
    tool: call.verb.replaceAll(" ", "_"),
    params: { ...call.params },
  };
}

/** The CLI spelling: positionals in the verb's own order, then flags. */
function renderCliCall(call: Call): string {
  const params = call.params ?? {};
  const positional =
    declared
      .get(call.verb)
      ?.params.filter((param) => param.positional)
      .map((param) => param.name) ?? [];
  const words = positional
    .filter((name) => name in params)
    .flatMap((name) => [params[name]].flat().map(quoteWord));
  for (const [name, value] of Object.entries(params)) {
    if (positional.includes(name) || value === false) continue;
    const flag = `--${kebabCase(name)}`;
    words.push(value === true ? flag : `${flag} ${quoteWord(value)}`);
  }
  return [`${RECOVERY_CLI_PREFIX}${call.verb}`, ...words].join(" ");
}

/** The MCP spelling: the tool name and its argument bag. */
function renderMcpCall(call: Call): string {
  const body = Object.entries(call.params ?? {})
    .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
    .join(", ");
  return `${call.verb.replaceAll(" ", "_")} ${body ? `{ ${body} }` : "{}"}`;
}

/**
 * Spell a call for the surface it is about to be printed on.
 *
 * @param call - The verb and params to make.
 * @param surface - `"cli"` for a command line, `"mcp"` for a tool call.
 * @returns `pragma token lookup color.text`, or `token_lookup { name: ["color.text"] }`.
 * @throws Error when call checking is on and the call is unsound.
 */
export function renderCall(call: Call, surface: Surface): string {
  const problem = checking ? findCallProblem(call) : undefined;
  if (problem) throw new Error(`Unsound call: ${problem}`);
  return surface === "mcp" ? renderMcpCall(call) : renderCliCall(call);
}

/** The sentence that ends a dead end: the exact next call, for this surface. */
export function renderNextStep(call: Call, surface: Surface): string {
  const lead = surface === "mcp" ? "Call" : "Run";
  return `${lead} \`${renderCall(call, surface)}\`.`;
}
