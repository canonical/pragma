/**
 * The `create` surface codegen: read `pragma.conf.ts`'s `generators`
 * declaration and the live generators it names, and write the two modules the
 * capability consumes.
 *
 * A SEPARATE module from `scripts/build.ts` on purpose: `build.ts` runs codegen
 * and COMPILES under `import.meta.main`, so the codegen is factored out here to
 * be importable and runnable without producing a 106 MB binary as a side effect.
 *
 * The regenerate-and-compare staleness guard this split was first written for
 * is GONE, and the next reader should not re-add it: `testing/perf/globalSetup
 * .ts` rebuilds `dist/pragma` before any test body runs, and that build
 * regenerates these modules — so the committed bytes on disk are always fresh
 * by the time a guard could read them. Measured (see `create.test.ts`): hand-
 * editing a prompt default and an import specifier both passed. What keeps the
 * committed bytes honest is the `git status` after a gate run.
 *
 * @note Impure — imports the declared packages and writes two modules.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AxisSurface,
  NounSurface,
  SerializedPrompt,
} from "../src/capabilities/create/types.js";
import type {
  GeneratorDeclaration,
  GeneratorNoun,
} from "../src/kernel/config/types.js";
import {
  DEFAULT_GENERATED_DIR,
  GENERATORS_MODULE,
  SURFACE_MODULE,
} from "./constants.js";

/**
 * What the codegen READS off a declared package's generator: its prompts, and
 * nothing else. The map's KEYS carry everything else this build needs (the axis
 * values, the resolved key), and the noun's identity comes entirely from
 * `pragma.conf.ts`.
 *
 * Reduced to that on purpose. It also declared `meta: { name: string }`, which
 * nothing here read and which constrained nothing either — the map arrives
 * through an `as` cast on a dynamic import, so a package without it type-checked
 * and ran identically. A field in the type that describes what a fork's package
 * owes the build, which the build never asks for, is the inert declaration this
 * slice exists to stop shipping.
 */
type GeneratorLike = {
  prompts: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Write a generated module only when its bytes differ.
 *
 * ONE determinism policy for all three generated modules, stated once: they are
 * deterministic, so a rebuild is a working-tree no-op — and no rewrite races a
 * concurrent import (the compiled-binary smoke test rebuilds while sibling
 * create tests run). Exported because `scripts/build.ts` writes the third
 * module, the embedded template manifest, under the same rule; it had its own
 * copy, and the next generated module would have had to pick one.
 *
 * @param path - The module path.
 * @param body - Its full contents.
 * @returns Whether it was written.
 * @note Impure — writes the filesystem.
 */
export function writeWhenChanged(path: string, body: string): boolean {
  if (existsSync(path) && readFileSync(path, "utf-8") === body) return false;
  writeFileSync(path, body);
  return true;
}

/**
 * The prompt kinds a surface entry can carry — the closed union
 * `SerializedPrompt["type"]` states, spelled once as values so the codegen can
 * CHECK a third-party prompt against it rather than assert its way past.
 */
const PROMPT_TYPES = ["text", "confirm", "select", "multiselect"] as const;

/**
 * Reduce a live `PromptDefinition` to the JSON-serialisable subset the grammar
 * adapter reads.
 *
 * `when` and `validate` are FUNCTIONS and cannot cross into a data module —
 * `when` survives as the boolean `conditional`, which is all `promptToParam`
 * reads it for (`required = default === undefined && !when`), and `validate` is
 * enforced inside `execute` by summon's own `validateAnswers`, on the live
 * generator, where it still is. `group` is dropped: the CLI grammar has no
 * notion of prompt groups.
 *
 * `type` is CHECKED, not cast, and it is the one field of an imported prompt
 * that has to be: {@link GeneratorLike} types a declared package's prompts as
 * `Record<string, unknown>` on purpose (the build must not require a fork's
 * package to match summon-core's types), so the value arrives unknown from a
 * module this repo did not write. Asserting it into the union instead wrote the
 * bogus string straight into the byte-pinned surface, where `promptToParam`'s
 * `default:` arm degraded it to a plain `--flag` string — and a `--fork` build
 * runs no `tsc`, so a fork got the degraded flag with a green build.
 *
 * @param noun - The declaring noun, for the message.
 * @param prompt - A live generator prompt.
 * @returns Its serialisable mirror.
 * @throws Error naming the noun, the prompt and the kinds a surface can carry.
 */
function reducePrompt(
  noun: string,
  prompt: Record<string, unknown>,
): SerializedPrompt {
  const type = PROMPT_TYPES.find((known) => known === prompt.type);
  if (type === undefined) {
    throw new Error(
      `\`create ${noun}\` has a prompt "${String(prompt.name)}" of type "${String(prompt.type)}", which the create surface cannot carry. A surface prompt is one of: ${PROMPT_TYPES.join(", ")}.`,
    );
  }
  // Key order is the EMITTED order, and the surface module is byte-pinned.
  return {
    name: String(prompt.name),
    type,
    message: String(prompt.message),
    ...(prompt.default !== undefined ? { default: prompt.default } : {}),
    ...(prompt.positional === true ? { positional: true } : {}),
    ...(prompt.choices !== undefined
      ? { choices: prompt.choices as SerializedPrompt["choices"] }
      : {}),
    ...(prompt.when !== undefined ? { conditional: true } : {}),
  };
}

/**
 * Choose the positional argument `assertInsideWorkspace` jails (SEC-2), and
 * refuse to leave one unjailed by accident.
 *
 * The declaration wins; otherwise a positional `text` prompt whose name ends in
 * `path` or `dir` is it. That heuristic fits the shipped generators and nothing
 * binds a fork to it, so ANY positional text prompt the choice does not cover
 * throws here. The failure mode this replaces is silence: `create.verb.ts`
 * jails only `if (pathParam)`, so a derivation yielding `undefined` DELETED the
 * jail rather than failing, and the guard on it was a literal map of the three
 * shipped nouns — blind by construction to every fork.
 *
 * @param noun - The declared noun name, for the message.
 * @param declared - The declared `pathParam`, when there is one.
 * @param prompts - The noun's serialised prompt mirrors.
 * @returns The param to jail, or `undefined` when the noun has no positional.
 * @throws Error when a positional text prompt would go unjailed, or when the
 *   declared `pathParam` is not one of the noun's positional text prompts.
 */
function selectPathParam(
  noun: string,
  declared: string | undefined,
  prompts: readonly SerializedPrompt[],
): string | undefined {
  const positional = prompts
    .filter((prompt) => prompt.positional === true && prompt.type === "text")
    .map((prompt) => prompt.name);
  if (declared !== undefined && !positional.includes(declared)) {
    throw new Error(
      `pragma.conf.ts declares \`create ${noun}\` with pathParam "${declared}", which is not one of its positional text prompts (${positional.join(", ") || "it has none"}).`,
    );
  }
  const chosen =
    declared ?? positional.find((name) => /(path|dir)$/i.test(name));
  const unjailed = positional.filter((name) => name !== chosen);
  if (unjailed.length > 0) {
    throw new Error(
      `\`create ${noun}\` has positional text prompt(s) ${unjailed.map((name) => `"${name}"`).join(", ")} that the workspace jail would not cover. Name the one to jail as \`pathParam\` in pragma.conf.ts — an unjailed positional path is SEC-2, and a silent \`undefined\` deletes the jail rather than failing.`,
    );
  }
  return chosen;
}

/**
 * The enum values a declared framework axis offers: every map key under
 * `<keyPrefix>/`, in MAP ORDER, with the prefix stripped.
 *
 * Map order is load-bearing — the first value is the enum's default — and it is
 * the declaring package's order, not this build's, so a package reordering its
 * generators moves the default and the reference bytes say so.
 *
 * @param keyPrefix - The declared prefix, or `undefined` for a `key` noun.
 * @param map - The package's live `generators` map.
 * @returns The axis values, empty when there is no prefix.
 */
function collectAxisValues(
  keyPrefix: string | undefined,
  map: Readonly<Record<string, GeneratorLike>>,
): string[] {
  if (keyPrefix === undefined) return [];
  return Object.keys(map)
    .filter((key) => key.startsWith(`${keyPrefix}/`))
    .map((key) => key.slice(keyPrefix.length + 1));
}

/**
 * Resolve the generator-map key a noun runs.
 *
 * A declared `key` is it; otherwise the axis form takes the FIRST value under
 * the prefix, which is also the enum's default. No `??` sentinel on the way: an
 * axis that resolved to nothing is a declaration fault, and a synthesised key
 * would report it as "the package does not export `undefined/<no-axis-values>`"
 * — a message about the package rather than about the conf. The validator
 * rejects a noun declaring neither form; the throw here covers the one it cannot
 * see, a `keyPrefix` no map key sits under.
 *
 * @param noun - The declared noun name, for the message.
 * @param declared - Its declaration.
 * @param packageName - The declaring package, for the message.
 * @param axisValues - The values collected under the declared prefix.
 * @param map - The package's live `generators` map, for the message.
 * @returns The map key.
 * @throws Error naming the noun when the prefix covers no generator.
 */
function resolveGeneratorKey(
  noun: string,
  declared: GeneratorNoun,
  packageName: string,
  axisValues: readonly string[],
  map: Readonly<Record<string, GeneratorLike>>,
): string {
  if (declared.key !== undefined) return declared.key;
  if (axisValues.length === 0) {
    throw new Error(
      `pragma.conf.ts declares \`create ${noun}\` with keyPrefix "${declared.keyPrefix}", and "${packageName}" exports no generator under "${declared.keyPrefix}/". It exports: ${Object.keys(map).sort().join(", ")}.`,
    );
  }
  return `${declared.keyPrefix}/${axisValues.at(0)}`;
}

/**
 * Assert every declared name that MIRRORS A PROMPT names one that exists.
 *
 * Four of a noun's fields carry generator prompt names — `optIn`,
 * `withPrefixed`, `noDefault` and the keys of `docs` — and `create.verb.ts`
 * applies all four by exact match (`includes`, or a lookup). So a misspelled
 * name is not a smaller effect: it is NO effect, accepted by the validator,
 * accepted by the codegen, and written verbatim into a surface where it does
 * nothing forever. Measured on a fork declaring `optIn: ["initGitt",
 * "runInstal"]`: the build printed success and the binary's `create monorepo
 * --yes` planned `git init` and `bun install` — the two effects reaching outside
 * the scaffold that `optIn` exists to switch off, and which the CLI grammar has
 * no `--no-` form to switch off any other way.
 *
 * The same argument {@link selectPathParam} throws on, applied to the fields it
 * does not cover: a declared field must never quietly stop doing anything.
 *
 * All four are checked WHOLE. `docs` used to be checked minus the axis key,
 * because one map carried both prompt help and the axis flag's own doc; the
 * axis declares that as `axisDoc` now, so there is no exception left to state.
 *
 * @param noun - The declared noun name, for the message.
 * @param declared - Its declaration.
 * @param prompts - The noun's serialised prompt mirrors, axis already dropped.
 * @throws Error naming the noun, the field, the bad name and the prompts that
 *   exist.
 */
function assertDeclaredPromptNames(
  noun: string,
  declared: GeneratorNoun,
  prompts: readonly SerializedPrompt[],
): void {
  const names = new Set(prompts.map((prompt) => prompt.name));
  const fields: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["optIn", declared.optIn ?? []],
    ["withPrefixed", declared.withPrefixed ?? []],
    ["noDefault", declared.noDefault ?? []],
    ["docs", Object.keys(declared.docs ?? {})],
  ];
  for (const [field, declaredNames] of fields) {
    const unknown = declaredNames.filter((name) => !names.has(name));
    if (unknown.length === 0) continue;
    throw new Error(
      `pragma.conf.ts declares \`create ${noun}\` with ${field} ${unknown.map((name) => `"${name}"`).join(", ")}, which ${unknown.length === 1 ? "is not a prompt" : "are not prompts"} of the generator it runs. A name matching no prompt is applied by exact match and therefore does nothing at all. Its prompts are: ${[...names].join(", ") || "it has none"}.`,
    );
  }
}

/**
 * Build the `--with-X` include-flag alias map from the declared bare names.
 *
 * ONE seam for the whole convention: the generator keeps its bare prompt names
 * (and with them its templates and byte-equality goldens), the CLI exposes
 * `--with-ssr`.
 *
 * @param withPrefixed - The declared bare prompt names.
 * @returns CLI param name → generator prompt name.
 */
function buildWithPrefixedAliases(
  withPrefixed: readonly string[] | undefined,
): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const bare of withPrefixed ?? []) {
    aliases[`with${bare.charAt(0).toUpperCase()}${bare.slice(1)}`] = bare;
  }
  return aliases;
}

/**
 * Derive one noun's surface entry: resolve, reduce, and ASSEMBLE.
 *
 * The steps that can each be wrong on their own have their own names —
 * {@link collectAxisValues}, {@link resolveGeneratorKey},
 * {@link buildWithPrefixedAliases}, {@link reducePrompt},
 * {@link assertDeclaredPromptNames} and, above all, {@link selectPathParam},
 * which decides which argument `assertInsideWorkspace` jails and is the one step
 * whose silent failure is a SECURITY failure. What is left here is the assembly.
 *
 * TWO REFUSALS, not one, and they divide the declaration between them: the
 * live generator decides whether a declared KEY exists, and the live prompts
 * decide whether a declared prompt NAME exists. Between them no field of a noun
 * can be wrong and silent.
 *
 * The framework axis is the only branch: `keyPrefix` + `axis` collapses every
 * map key under `<keyPrefix>/` into one verb plus an enum flag, and the prompt
 * mirror is taken from the first — which is what the hand-written mirror did,
 * by hand, for react.
 *
 * `docs` carries the PROMPT overrides and nothing else — help text the build
 * cannot derive from a prompt's `message` — so it is copied through whole. The
 * axis flag's own doc mirrors no prompt and is declared as `axisDoc`, beside
 * the axis it documents; it used to be declared inside `docs` under the axis
 * name, which cost this function a lookup and a re-filter, the prompt-name
 * assertion an exception, and the schema a reach into another map, all to carry
 * one string the surface already emitted separately. The axis triple
 * (`axis`/`axisValues`/`axisDoc`) is written together or not at all, so
 * `create.verb.ts` reads the doc off the same guard that reads the values.
 *
 * @param noun - The declared noun name.
 * @param declared - Its declaration.
 * @param packageName - The declaring package.
 * @param map - The package's live `generators` map.
 * @returns The surface entry.
 * @throws Error naming the noun when its declaration resolves to no generator.
 */
function deriveNounSurface(
  noun: string,
  declared: GeneratorNoun,
  packageName: string,
  map: Readonly<Record<string, GeneratorLike>>,
): NounSurface {
  const { keyPrefix, axis, axisDoc } = declared;
  const axisValues = collectAxisValues(keyPrefix, map);
  const key = resolveGeneratorKey(noun, declared, packageName, axisValues, map);
  const generator = map[key];
  if (generator === undefined) {
    throw new Error(
      `pragma.conf.ts declares \`create ${noun}\` against "${packageName}"'s generator "${key}", which that package does not export. It exports: ${Object.keys(map).sort().join(", ")}.`,
    );
  }

  const aliases = buildWithPrefixedAliases(declared.withPrefixed);

  // ONE VALUE DECIDES THE WHOLE AXIS. The triple is what `create.verb.ts` reads
  // to build the enum flag, so it is also what says whether the axis EXISTS —
  // and everything downstream is derived from it rather than re-testing its
  // parts. The previous form gated the prompt drop on `keyPrefix` alone while
  // gating the triple on all three, so an `axis` that produced no enum still
  // deleted the prompt it named: a required param vanishing from the surface
  // with nothing red. The schema rejects that input today; deriving both from
  // one value is what makes the safety a fact rather than a comment.
  const axisTriple: AxisSurface | undefined =
    axis !== undefined && keyPrefix !== undefined && axisDoc !== undefined
      ? { axis, axisValues, axisDoc, keyPrefix }
      : undefined;

  // The axis prompt is dropped because the CLI replaces it with an enum FLAG
  // built from the map keys.
  const prompts = generator.prompts
    .filter((prompt) => prompt.name !== axisTriple?.axis)
    .map((prompt) => reducePrompt(noun, prompt));

  assertDeclaredPromptNames(noun, declared, prompts);

  const pathParam = selectPathParam(noun, declared.pathParam, prompts);

  return {
    package: packageName,
    key,
    ...(axisTriple ?? {}),
    summary: declared.summary,
    useWhen: declared.useWhen,
    examples: declared.examples ?? [],
    prompts,
    docs: declared.docs ?? {},
    ...(pathParam !== undefined ? { pathParam } : {}),
    aliases,
    optIn: declared.optIn ?? [],
    noDefault: declared.noDefault ?? [],
  };
}

/**
 * Generate the create surface's two modules from the declaration.
 *
 * The build dynamic-imports each declared package — a build HAS a filesystem, so
 * a computed specifier resolves — reads its live `generators` map, and writes
 * the literal specifiers a `--compile` bundle needs plus the derived surface
 * data. Deterministic: nouns in declaration order, object keys written in a
 * fixed order, so a rebuild is a working-tree no-op.
 *
 * @param declared - The declaring config's `generators`, in declaration order.
 * @param outDir - Where the two modules land. A fork build passes its own.
 * @returns The nouns generated, in surface order.
 * @note Impure — imports the declared packages and writes two modules.
 */
export async function generateCreateSurface(
  declared: readonly GeneratorDeclaration[],
  outDir: string = DEFAULT_GENERATED_DIR,
): Promise<string[]> {
  const surface: Record<string, NounSurface> = {};
  const importLines: string[] = [];
  const mapEntries: string[] = [];

  for (const [index, declaration] of declared.entries()) {
    const local = `g${index}`;
    importLines.push(
      `import { generators as ${local} } from ${JSON.stringify(declaration.name)};`,
    );
    mapEntries.push(
      `  [${JSON.stringify(declaration.name)}]: ${local} as unknown as GeneratorMap,`,
    );
    const module = (await import(declaration.name)) as {
      generators?: Readonly<Record<string, GeneratorLike>>;
    };
    const map = module.generators;
    if (map === undefined) {
      throw new Error(
        `pragma.conf.ts declares generator package "${declaration.name}", which exports no \`generators\` map. A declared package must export one.`,
      );
    }
    for (const [noun, declaredNoun] of Object.entries(declaration.nouns)) {
      // TWO PACKAGES CANNOT SHARE A NOUN. `nouns` is an object per declaration,
      // so a key collides only ACROSS declarations — and the surface is one flat
      // map, so the second assignment would delete the first noun's whole verb
      // while `generators.generated.ts` still imported the losing package. That
      // is the fault this codegen refuses on everywhere else (an unjailed
      // positional, a prompt name matching nothing, a colliding embedded key),
      // in its worst form: a VERB disappearing rather than a field. Unreachable
      // from this distribution's three distinct nouns; reachable the moment a
      // fork declares its own `component` package beside an upstream one.
      const incumbent = surface[noun];
      if (incumbent !== undefined) {
        throw new Error(
          `pragma.conf.ts declares \`create ${noun}\` twice: "${incumbent.package}" and "${declaration.name}" both expose it. One would silently replace the other in the generated surface while both packages stayed linked into the binary. Rename one noun.`,
        );
      }
      surface[noun] = deriveNounSurface(
        noun,
        declaredNoun,
        declaration.name,
        map,
      );
    }
  }

  const valueModule = `// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// Regenerate: \`bun run scripts/build.ts\`. The LITERAL import specifiers a
// \`bun build --compile\` bundle needs, written from \`pragma.conf.ts\`'s
// \`generators\` declaration. A computed \`import(name)\` would leave these
// modules out of the binary; the build resolves the declaration and writes the
// literals instead. Reached only through \`pickGenerator.ts\` — importing this
// pulls summon-core, and with it React.
import type { GeneratorDefinition } from "@canonical/summon-core";
${importLines.join("\n")}

/** A declared package's generator map, erased to the base definition. */
type GeneratorMap = Record<string, GeneratorDefinition | undefined>;

/** Package name → its live generator map. */
export const GENERATOR_MODULES: Record<string, GeneratorMap> = {
${mapEntries.join("\n")}
};
`;

  const dataModule = `// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// Regenerate: \`bun run scripts/build.ts\`. The \`create\` surface, derived from
// \`pragma.conf.ts\`'s \`generators\` declaration and the live generators it names:
// each noun's prompt mirror, framework axis, path param, summary and examples.
// ZERO IMPORTS, deliberately — \`create.verb.ts\` reads this on the \`--help\` and
// \`__complete\` fast paths, which must load neither a generator nor summon-core.
/** Noun → its derived create surface. */
export const CREATE_SURFACE = ${JSON.stringify(surface, null, 2)} as const;
`;

  writeWhenChanged(join(outDir, GENERATORS_MODULE), valueModule);
  writeWhenChanged(join(outDir, SURFACE_MODULE), dataModule);
  return Object.keys(surface);
}
