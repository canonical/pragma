/**
 * The kernel's own top-level declarations — the small set of facts that belong
 * to no sub-domain because every sub-domain may need them.
 *
 * This is NOT a facade over the kernel. `kernel/` is a namespace of domains,
 * each of which keeps its own barrel (`config/`, `render/`, `runtime/`,
 * `packs/`, `error/`, `spec/`, `completion/`, `project/…`); a consumer wanting
 * one of those imports that domain's barrel, not this one. What lives here is
 * only what sits directly in `kernel/`, and the bar for putting a file there
 * is high: it must be a declaration the kernel makes about itself rather than
 * a step in any one pipeline.
 *
 * Today that is the declared vocabulary and the interactivity vocabulary. The
 * latter (`interactivity.ts`) names the questions about attended streams — is
 * stdout captured, may we prompt, may we color (that third one lives with the
 * styler, for the dependency reason its docblock records) — which render,
 * dispatch and flag parsing each used to answer with their own inline probe.
 * They are different questions over different streams, and the names are what
 * keeps them from being flattened into one flag.
 *
 * The declared vocabulary is the distribution's mapping from the roles the
 * CLI knows (a prompt, a resource) onto the RDF terms that actually
 * carry them in the active graph. It is parsed once at module load and read
 * from the prompt capability, the MCP prompt source, and the pack index
 * builder, none of which owns it and any of which would otherwise hardcode
 * someone else's IRIs.
 *
 * The copy-gate rule table (`copy.ts`) deliberately stays off this barrel. It
 * is reviewed data consumed by its own test and by nothing else at runtime;
 * exporting it here would advertise a runtime API the gate does not have.
 */

export { canPrompt, stdoutIsCaptured } from "./interactivity.js";
export type { DeclaredVocabulary } from "./vocabulary.js";
export { VOCABULARY } from "./vocabulary.js";
