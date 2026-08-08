/**
 * The `create` verbs — ONE PER DECLARED NOUN, whatever a distribution declares.
 * Each is a mutating, interactive, storeless verb. A noun declaring a framework
 * axis collapses several generators into one verb plus an enum flag.
 *
 * LAZY DISPATCH (R9 + lazy-React): the params are STATIC — built by the
 * generator→grammar adapter over `surface.generated.ts`, the ZERO-IMPORT data
 * module `scripts/build.ts` derives from `pragma.conf.ts` AND the live
 * generators it names. So the mirrors ARE the live generators, resolved at build
 * time rather than copied by hand: there is no hand-written mirror to drift, and
 * no parity test to keep one honest. The `run` body lazily `import()`s
 * `pickGenerator` + summon-core, so `buildProgram` / `--help` / `__complete` /
 * reads never load summon-core or the generators — and `create --yes` never
 * loads React (the Ink UI is dynamic-only, and only the TTY branch even asks
 * for it).
 *
 * What checks the derivation is outside it: the literal pins in
 * `create.test.ts` (the path-param map, the noun set, the import specifiers
 * read as source text) and the frozen covenant's per-verb conformance.
 */

import type { GeneratorResult, PromptDefinition } from "@canonical/summon-core";
import type { Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { ParamSpec, VerbSpec } from "../../kernel/spec/types.js";
import { createFormatters } from "./create.render.js";
import { promptToParam } from "./generatorToVerbSpec.js";
import { assertInsideWorkspace } from "./pathJail.js";
import { CREATE_SURFACE } from "./surface.generated.js";
import type { CreateKind, NounSurface, SerializedPrompt } from "./types.js";

// =============================================================================
// The static surface — DERIVED, not mirrored
// =============================================================================

/**
 * Re-key a param bag's CLI include-flag aliases to the generator prompt names,
 * so the summon generator reads `ssr` where the CLI grammar exposes `--with-ssr`.
 *
 * The alias map is DECLARED per noun (`withPrefixed`) and generated into the
 * surface, because it is a CLI-grammar convention rather than a generator fact:
 * the generator keeps its bare prompt names, and with them its templates and
 * byte-equality goldens.
 *
 * @param kind - The create noun (selects the alias map).
 * @param params - The coerced CLI/MCP param bag.
 * @returns A new bag with aliased keys renamed to the generator prompt names.
 */
export function toGeneratorAnswers(
  kind: CreateKind,
  params: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const aliases: Readonly<Record<string, string>> =
    CREATE_SURFACE[kind].aliases;
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    answers[aliases[key] ?? key] = value;
  }
  return answers;
}

/**
 * Invert a noun's alias map: generator prompt name → CLI param name.
 *
 * The surface stores it the other way round (`withSsr` → `ssr`) because that is
 * the direction {@link toGeneratorAnswers} needs at run time, when a param bag
 * comes back from the CLI or MCP. Building params walks the other way.
 *
 * @param aliases - The declared alias map, CLI name → prompt name.
 * @returns Prompt name → CLI name.
 */
function invertAliases(
  aliases: Readonly<Record<string, string>>,
): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const [flag, bare] of Object.entries(aliases)) inverted[bare] = flag;
  return inverted;
}

/**
 * Apply the CLI-grammar overlays that belong to the PROMPT, before conversion.
 *
 * Each is DECLARED in `pragma.conf.ts` rather than assumed here:
 *  - `withPrefixed` renames a prompt onto the `--with-X` include-flag
 *    convention, so the generator keeps its bare names (and with them its
 *    templates and byte-equality goldens);
 *  - `optIn` forces a confirm to `default: false`, because the grammar has no
 *    `--no-` form and a default-true boolean could never be turned off.
 *
 * The `conditional` → `when` shim is not an overlay but a re-hydration: `when`
 * is a FUNCTION and cannot cross into a data module, and `promptToParam` reads
 * it for truthiness only (`required = default === undefined && !when`).
 *
 * @param prompt - The serialised prompt from the surface.
 * @param noun - Its noun's surface entry.
 * @param toCliName - The inverted alias map.
 * @returns The prompt as `promptToParam` should see it.
 */
function applyPromptOverlays(
  prompt: SerializedPrompt,
  noun: NounSurface,
  toCliName: Readonly<Record<string, string>>,
): PromptDefinition {
  return {
    ...prompt,
    name: toCliName[prompt.name] ?? prompt.name,
    ...(noun.optIn.includes(prompt.name) ? { default: false } : {}),
    ...(prompt.conditional === true ? { when: () => true } : {}),
  } as PromptDefinition;
}

/**
 * Apply the overlays that belong to the PARAM, after conversion.
 *
 *  - `noDefault` drops a ParamSpec default so the SELECTED axis value's own
 *    prompt default applies instead (react and svelte/lit differ on
 *    `componentPath`). The param stays optional: `required` was computed from
 *    the generator's real default, before it was dropped.
 *  - `docs` WINS over the doc derived from the wizard question. A question
 *    usually reads as help once `declarativeDoc` strips its `?`/`:` — but
 *    `Component path:` does not carry the naming rule `--help` and the MCP arg
 *    schema need, and rewording the message would move the interactive prompt.
 *    So the override is content, keyed by the GENERATOR's prompt name.
 *
 * Both are keyed by the prompt's own name, not the aliased CLI name, which is
 * why this runs against the original prompt rather than the converted param.
 *
 * COPYING, not in-place. The first form cast `param` to a record and mutated
 * it, so the name (`apply…`), the signature (param in, param out) and the
 * `@returns` all read as a pure transform over a function that edited its
 * caller's object. No live bug — {@link buildParams} passes a freshly built
 * `promptToParam(...)` result inline — but a caller that reused a ParamSpec, or
 * memoized `promptToParam`, would have corrupted the shared one silently. The
 * copy also makes the widening at the end honest: it converts a record this
 * function owns, not a round trip through the caller's.
 *
 * @param param - The converted param.
 * @param prompt - The prompt it came from.
 * @param noun - Its noun's surface entry.
 * @returns A COPY of the param with the declared overrides applied.
 */
function applyParamOverrides(
  param: ParamSpec,
  prompt: SerializedPrompt,
  noun: NounSurface,
): ParamSpec {
  const fields: Record<string, unknown> = { ...param };
  if (noun.noDefault.includes(prompt.name)) delete fields.default;
  const declaredDoc = noun.docs[prompt.name];
  if (declaredDoc !== undefined) fields.doc = declaredDoc;
  return fields as unknown as ParamSpec;
}

/**
 * The enum param a declared framework axis contributes, when there is one.
 *
 * The axis triple is written together by the build or not at all, so ONE guard
 * covers all three — and the flag's DOC is declared beside its values, never a
 * literal here: this module must not know what any distribution's axis is about.
 * Its values are the generator keys the package actually ships and its default
 * is the first, so `--help` can never advertise a default outside the enum.
 *
 * @param noun - The noun's surface entry.
 * @returns The enum param, or `undefined` when the noun declares no axis.
 */
function buildAxisParam(noun: NounSurface): ParamSpec | undefined {
  const { axis, axisValues, axisDoc } = noun;
  if (axis === undefined || axisValues === undefined || axisDoc === undefined) {
    return undefined;
  }
  return {
    kind: "enum",
    name: axis,
    doc: axisDoc,
    values: axisValues,
    // The FIRST declared value, so the default is always inside the enum.
    default: axisValues.at(0),
  };
}

/**
 * Build one noun's params from its derived surface: convert, overlay, ASSEMBLE.
 *
 * Each overlay that can be separately wrong has its own name —
 * {@link invertAliases}, {@link applyPromptOverlays},
 * {@link applyParamOverrides} and {@link buildAxisParam}. They are the four
 * things a fork TUNES (`withPrefixed`, `optIn`, `noDefault`, `docs`, plus the
 * axis), so a fork debugging why its `--with-x` flag did not appear has a named
 * unit to read. This is the mirror image of `scripts/generateCreateSurface.ts`
 * #deriveNounSurface, and it is factored the same way.
 *
 * @param kind - The create noun.
 * @returns Its params, axis first when declared, then in surface order.
 */
function buildParams(kind: CreateKind): ParamSpec[] {
  const noun: NounSurface = CREATE_SURFACE[kind];
  const toCliName = invertAliases(noun.aliases);
  const params = noun.prompts.map((prompt) =>
    applyParamOverrides(
      promptToParam(applyPromptOverlays(prompt, noun, toCliName)),
      prompt,
      noun,
    ),
  );
  const axisParam = buildAxisParam(noun);
  return axisParam === undefined ? params : [axisParam, ...params];
}

/** The path param each noun jails, derived by the build (SEC-2). */
const PATH_PARAM: Record<CreateKind, string | undefined> = Object.fromEntries(
  Object.entries(CREATE_SURFACE).map(([kind, noun]: [string, NounSurface]) => [
    kind,
    noun.pathParam,
  ]),
) as Record<CreateKind, string | undefined>;

// =============================================================================
// The lazy run — the one-line summon↔pragma seam per invocation
// =============================================================================

/**
 * True when a dynamic import failed because the module could not be RESOLVED.
 *
 * This is NOT the retired source-run-only gate — it is a BUNDLING backstop, and
 * it survives that gate's deletion for a different reason. summon-core and the
 * generators reach the binary through static dynamic imports; if a bundler
 * change ever drops one, the symptom is an unresolvable specifier at run time,
 * and without this it surfaces as "Internal error — please report this issue".
 * Matched structurally across bun (`ResolveMessage`) and node
 * (`ERR_MODULE_NOT_FOUND`) so a genuine runtime error still propagates.
 */
export function isModuleNotFound(cause: unknown): boolean {
  if (!cause || typeof cause !== "object") return false;
  const { code, name, message } = cause as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
  };
  return (
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    name === "ResolveMessage" ||
    (typeof message === "string" &&
      /cannot find (module|package)/i.test(message))
  );
}

/**
 * Load the create runtime: inject the embedded template manifest, then import
 * the generator selector + summon-core (STATIC dynamic imports, so bun's
 * `--compile` bundler includes them — they stay behind this lazy boundary, so
 * the fast paths and `create --yes` still load neither summon-core nor React).
 *
 * The manifest is injected BEFORE `pickGenerator` — every declared generator
 * reads through the registry when its disk read fails (the compiled binary), and
 * loads its files on first `generate()`. The registry is imported from
 * `@canonical/summon-core/embedded`, a submodule with no imports beyond
 * `node:fs`, so this does not evaluate a generator index. Naming summon-core —
 * infrastructure this CLI depends on regardless — rather than a declared
 * generator package is deliberate: a fork that swaps its generator packages
 * cannot leave this import pointing at a package it no longer ships. In a source
 * run the disk read wins and the manifest is inert.
 *
 * There is nothing left for this module to GATE, and that is a claim the BUILD
 * makes rather than one asserted here: `scripts/declaredGenerators.ts
 * #assertReadsEmbeddedRegistry` refuses to embed a declared package's templates
 * unless that package reaches for this registry, so "reads through the registry"
 * is a precondition of shipping rather than a per-noun bit. Every declared
 * `create` noun therefore runs from the shipped binary, and each of this
 * distribution's is proved byte-for-byte against a source run in
 * `compiledCreate.subprocess.test.ts`. A resolution failure — the bundling
 * regression {@link isModuleNotFound} detects — is turned into a readable
 * refusal rather than an internal-bug report.
 */
async function loadCreateRuntime() {
  try {
    // Inject the embedded manifest before the generators evaluate.
    const [{ setEmbeddedFiles }, { TEMPLATES }] = await Promise.all([
      import("@canonical/summon-core/embedded"),
      import("./templates.embedded.generated.js"),
    ]);
    setEmbeddedFiles(TEMPLATES);

    const [pick, summon] = await Promise.all([
      import("./pickGenerator.js"),
      import("@canonical/summon-core"),
    ]);
    return { pickGenerator: pick.pickGenerator, summon };
  } catch (cause) {
    if (isModuleNotFound(cause)) {
      throw new PragmaError({
        code: "UNSUPPORTED",
        message:
          "`create` could not load its generator runtime — its generator modules were not resolvable. This is a build defect, not a limitation of this installation.",
        recovery: {
          message: `Reinstall ${BIN_NAME}, or report the issue if a reinstall does not fix it.`,
        },
      });
    }
    throw cause;
  }
}

/**
 * Build the `create` Task for one invocation: pick the generator, jail its
 * output path, pre-validate flag/arg answers, pick the prompt strategy against
 * the interaction context, wire `runtime.exec`, and return `execute`.
 *
 * @param kind - The create noun.
 * @param params - The coerced params for this invocation.
 * @param rt - The pragma runtime.
 * @returns A `Promise<Task<GeneratorResult>>` (the union's third arm) the
 *   dispatcher/MCP handler awaits into a Task before interpreting.
 */
async function runCreate(
  kind: CreateKind,
  params: Record<string, unknown>,
  rt: PragmaRuntime,
): Promise<Task<GeneratorResult>> {
  // Lazy: importing these pulls summon-core (and with it React) — kept off every
  // non-create path. STATIC dynamic imports so `--compile` bundles them; the
  // embedded file manifest is injected here.
  const { pickGenerator, summon } = await loadCreateRuntime();

  // Normalize the CLI/MCP `--with-X` include-flags to the generator prompt names
  // (AV-228 B8) once, at this seam; every summon interaction below reads the
  // generator-facing `answers` bag so the generator prompt names stay stable.
  const answers = toGeneratorAnswers(kind, params);

  const generator = pickGenerator(kind, answers);

  // SEC-2: reject a path escaping the workspace BEFORE any effect runs.
  const pathParam = PATH_PARAM[kind];
  if (pathParam) assertInsideWorkspace(pathParam, answers[pathParam], rt.cwd);

  // Reject a flag/arg-provided answer that fails its prompt's own constraint,
  // with a clean INVALID_INPUT (execute re-validates as a backstop).
  const invalid = summon.validateAnswers(generator.prompts, answers);
  if (invalid !== null) {
    throw new PragmaError({ code: "INVALID_INPUT", message: invalid });
  }

  const { isTTY, transport, yes, signal, abort } = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: true,
  };
  const stamp = summon.createGeneratorStamp(generator);

  // TTY without --yes → the embedded Ink wizard (identical #819 flow). The
  // session both answers prompts and renders live effect progress, so its
  // callbacks ride runtime.exec alongside the shared stamping transform.
  if (isTTY && !yes) {
    // `onCancel` (H2): an in-Ink Ctrl-C during execution aborts the run so the
    // interpreter stops writing — raw mode swallows the SIGINT, so the wizard
    // drives the abort. Shared with setup by construction.
    const session = summon.inkPrompt(generator, { signal, onCancel: abort });
    // Thread the per-call write root: the interpreter resolves the generator's
    // relative output paths against `rt.cwd` — the SAME dir the SEC-2 jail
    // validated above — so the write can never escape the checked directory.
    rt.exec = {
      cwd: rt.cwd,
      promptHandler: session.promptHandler,
      onEffectStart: summon.createStampOnEffectStart(
        stamp,
        session.onEffectStart,
      ),
      onEffectComplete: session.onEffectComplete,
      onLog: session.onLog,
      dispose: session.dispose,
      signal,
    };
    return summon.execute(generator, {
      prompt: session.promptHandler,
      params: answers,
      signal,
    });
  }

  // Non-interactive: MCP → params-or-error; CLI/--yes/CI → flags+defaults.
  const prompt =
    transport === "mcp"
      ? summon.mcpPrompt(answers)
      : summon.autoPrompt(answers);
  // Same per-call write root as the Ink branch: `rt.cwd` feeds both the SEC-2
  // jail and the interpreter's effect-path base, atomically.
  rt.exec = {
    cwd: rt.cwd,
    promptHandler: prompt,
    onEffectStart: summon.createStampOnEffectStart(stamp),
    onLog: (_level, message) => process.stderr.write(`${message}\n`),
    signal,
  };
  return summon.execute(generator, { prompt, params: answers, signal });
}

/**
 * The shared capability: storeless, mutating, interactive, MCP-exposed.
 *
 * `destructive: false` is load-bearing (D4): create only WRITES NEW files, so it
 * is explicitly non-destructive. Without it `annotationsFor` emits no
 * `destructiveHint`, and MCP clients default an unset hint on a non-read-only
 * tool to `true` — advertising create as destructive, the opposite of intent.
 */
const CREATE_CAPABILITY = {
  needsStore: false,
  mutates: true,
  destructive: false,
  interactive: true,
  mcp: {
    expose: true as const,
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
};

/**
 * Build a create verb. `run` presents `Promise<Task<R>>` through the `Task<R>`
 * arm by an honest cast at this one site (mirroring `sources update`): a literal
 * `Promise<Task<R>>` arm in the union would poison async read-verb inference.
 *
 * No availability caveat: every `create` noun runs from the shipped binary, so
 * the `summary` is the whole story and there is nothing for a `doc` to withdraw.
 */
function createVerb(
  kind: CreateKind,
  summary: string,
  params: ParamSpec[],
  examples: VerbSpec["examples"],
): VerbSpec<Record<string, unknown>, GeneratorResult> {
  return {
    path: ["create", kind],
    summary,
    params,
    output: { formatters: createFormatters },
    examples,
    capability: CREATE_CAPABILITY,
    run: (params_, rt) =>
      runCreate(kind, params_, rt) as unknown as Task<GeneratorResult>,
  };
}

/**
 * The `create` verbs, one per DECLARED noun — key order is the declaration's,
 * which `index.ts` preserves into the command tree, `--help` and the emitted
 * surface. Adding a noun is an edit to `pragma.conf.ts` and a rebuild; there is
 * nothing to add here.
 *
 * `examples[].cmd` is composed from `BIN_NAME` at this one site. The
 * declaration writes the command WITHOUT the binary name — the same rule
 * `emptyRecovery.cli` follows, and what `kernel/copy.test.ts` enforces over
 * `src/capabilities/**`.
 */
export const createVerbs: Record<
  CreateKind,
  VerbSpec<Record<string, unknown>, GeneratorResult>
> = Object.fromEntries(
  Object.entries(CREATE_SURFACE).map(([kind, noun]) => [
    kind,
    createVerb(
      kind as CreateKind,
      noun.summary,
      buildParams(kind as CreateKind),
      (noun.examples as ReadonlyArray<{ cmd: string; note?: string }>).map(
        (example) => ({
          cmd: `${BIN_NAME} ${example.cmd}`,
          ...(example.note !== undefined ? { note: example.note } : {}),
        }),
      ),
    ),
  ]),
) as Record<CreateKind, VerbSpec<Record<string, unknown>, GeneratorResult>>;
