/**
 * The ONE generator of tool guidance.
 *
 * A verb declares the question it answers (`useWhen`) and one real call
 * (`example`) once. Everything a caller reads when choosing a tool is built
 * here from those two and the summary: the MCP tool description, the
 * `capabilities` catalogue entry, the verb's help and the reference. A sentence
 * that lives in one place cannot be true in the catalogue and missing from the
 * description, which is how an agent that never called `capabilities` came to
 * choose between fifty tools without it.
 *
 * It names no tool: what the distribution says about its own tools arrives as
 * data (a verb's fields, a module's `mcpOrientation`).
 *
 * Zod-free: the catalogue and help read it on the fast path.
 */

import { renderCall } from "./call.js";
import type { Call, ToolCategory, VerbSpec } from "./types.js";

/** A verb's category: `write` ⟺ it mutates, else what it declares, else `read`. */
export function verbCategory(verb: VerbSpec): ToolCategory {
  return verb.capability.mutates ? "write" : (verb.category ?? "read");
}

/**
 * A verb's declared example as a call. A verb with no required param may
 * declare none — called bare, its only call is its own name — and then none
 * is rendered.
 */
export function exampleCall(verb: VerbSpec): Call | undefined {
  return verb.example
    ? { verb: verb.path.join(" "), params: verb.example }
    : undefined;
}

/**
 * `useWhen` as a sentence. It is stored as the bare clause ("when asked which
 * components use a token") because the catalogue's field is already named
 * `use_when`; prose adds the lead.
 */
export function useWhenSentence(verb: VerbSpec): string | undefined {
  return verb.useWhen ? `Use ${verb.useWhen}.` : undefined;
}

/**
 * The agent-facing MCP tool description: the question first — it is what a
 * caller scanning fifty descriptions matches its task against — then what the
 * tool returns when a richer `doc` is authored, then one call to copy. The
 * one-line summary is the fallback for a verb declaring no question, never a
 * second sentence after one: it says the same thing less usefully.
 *
 * @param verb - The verb to describe.
 * @returns The description.
 */
export function describeTool(verb: VerbSpec): string {
  const question = useWhenSentence(verb);
  const example = exampleCall(verb);
  const rendered = example && `Example: ${renderCall(example, "mcp")}.`;
  return [
    question,
    verb.doc ?? (question ? undefined : verb.summary),
    // A third-party description may still end in its own hand-typed example.
    rendered && !verb.doc?.includes("Example:") ? rendered : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}
