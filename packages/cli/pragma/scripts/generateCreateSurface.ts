/**
 * The `create` surface codegen: read `pragma.conf.ts`'s `generators`
 * declaration and the live generators it names, and write the two modules the
 * capability consumes.
 *
 * A SEPARATE module from `scripts/build.ts` on purpose. `create.test.ts` calls
 * this to regenerate into place and assert the committed bytes did not move —
 * the same drift-guard shape `docs/reference` uses. Importing `build.ts` for
 * that would run its `import.meta.main` block, which compiles a 106 MB binary
 * as a side effect of a unit test AND regenerates before the test can read the
 * committed bytes, making the guard pass no matter what. Measured: it did.
 *
 * @note Impure — imports the declared packages and writes two modules.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GeneratorDeclaration,
  GeneratorNoun,
} from "../src/kernel/config/types.js";

const scriptsUrl = new URL(".", import.meta.url);

/**
 * Where the shipped distribution's generated modules land — the DEFAULT, not a
 * constant. A fork build passes its own directory, which is what makes the
 * declaration a parameter of the build rather than an import of it.
 */
export const DEFAULT_GENERATED_DIR = fileURLToPath(
  new URL("../src/capabilities/create/", scriptsUrl),
);

/** The value module's basename, shared with the bundler's fork alias. */
export const GENERATORS_MODULE = "generators.generated.ts";

/** The data module's basename, shared with the bundler's fork alias. */
export const SURFACE_MODULE = "surface.generated.ts";

/** The shape a generator package exposes: its `generators` map. */
type GeneratorLike = {
  meta: { name: string };
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
 * @param prompt - A live generator prompt.
 * @returns Its serialisable mirror.
 */
function reducePrompt(
  prompt: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: prompt.name,
    type: prompt.type,
    message: prompt.message,
  };
  if (prompt.default !== undefined) out.default = prompt.default;
  if (prompt.positional === true) out.positional = true;
  if (prompt.choices !== undefined) out.choices = prompt.choices;
  if (prompt.when !== undefined) out.conditional = true;
  return out;
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
  prompts: ReadonlyArray<Record<string, unknown>>,
): string | undefined {
  const positional = prompts
    .filter((prompt) => prompt.positional === true && prompt.type === "text")
    .map((prompt) => String(prompt.name));
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
 * Derive one noun's surface entry from its declaration and the live generator.
 *
 * The framework axis is the only branch: `keyPrefix` + `axis` collapses every
 * map key under `<keyPrefix>/` into one verb plus an enum flag, values in MAP
 * ORDER with the first as the default, and the prompt mirror is taken from the
 * first — which is what the hand-written mirror did, by hand, for react.
 *
 * The PATH PARAM is SEC-2 critical — see {@link selectPathParam}, which either
 * names the argument `assertInsideWorkspace` jails or throws. A noun with no
 * positional at all is jailed by its own name-derived subdirectory instead.
 *
 * `docs` rides through as declared: help text the build cannot derive from a
 * prompt's `message`, plus the `axis` flag's own doc, which mirrors no prompt.
 * The axis triple (`axis`/`axisValues`/`axisDoc`) is written together or not at
 * all, so `create.verb.ts` can read the doc off the same guard that reads the
 * values.
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
): Record<string, unknown> {
  const { keyPrefix, axis } = declared;
  const axisValues =
    keyPrefix === undefined
      ? []
      : Object.keys(map)
          .filter((key) => key.startsWith(`${keyPrefix}/`))
          .map((key) => key.slice(keyPrefix.length + 1));
  // No `??` sentinel: an axis that resolved to nothing is a declaration fault,
  // and a synthesised key would report it as "the package does not export
  // `undefined/<no-axis-values>`" — a message about the package rather than
  // about the conf. The validator rejects a noun declaring neither form; this
  // covers the one it cannot see, a `keyPrefix` no map key sits under.
  if (declared.key === undefined && axisValues.length === 0) {
    throw new Error(
      `pragma.conf.ts declares \`create ${noun}\` with keyPrefix "${keyPrefix}", and "${packageName}" exports no generator under "${keyPrefix}/". It exports: ${Object.keys(map).sort().join(", ")}.`,
    );
  }
  const key = declared.key ?? `${keyPrefix}/${axisValues.at(0)}`;
  const generator = map[key];
  if (generator === undefined) {
    throw new Error(
      `pragma.conf.ts declares \`create ${noun}\` against "${packageName}"'s generator "${key}", which that package does not export. It exports: ${Object.keys(map).sort().join(", ")}.`,
    );
  }

  // The CLI's `--with-X` include-flag convention, applied at ONE seam: the
  // generator keeps its bare prompt names (and with them its templates and
  // byte-equality goldens), the CLI exposes `--with-ssr`.
  const aliases: Record<string, string> = {};
  for (const bare of declared.withPrefixed ?? []) {
    aliases[`with${bare.charAt(0).toUpperCase()}${bare.slice(1)}`] = bare;
  }

  // The axis prompt is dropped because the CLI replaces it with an enum FLAG
  // built from the map keys. Gated on `keyPrefix`, belt-and-braces behind the
  // validator: an `axis` that produced no enum must not still delete the prompt
  // it names — that is a required param vanishing from the surface with nothing
  // red.
  const dropped = keyPrefix === undefined ? undefined : axis;
  const prompts = generator.prompts
    .filter((prompt) => prompt.name !== dropped)
    .map(reducePrompt);

  const docs = declared.docs ?? {};
  const axisDoc = axis === undefined ? undefined : docs[axis];
  const pathParam = selectPathParam(noun, declared.pathParam, prompts);

  return {
    package: packageName,
    key,
    ...(axis !== undefined && keyPrefix !== undefined && axisDoc !== undefined
      ? { axis, axisValues, axisDoc, keyPrefix }
      : {}),
    summary: declared.summary,
    useWhen: declared.useWhen,
    examples: declared.examples ?? [],
    prompts,
    docs,
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
  const surface: Record<string, unknown> = {};
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
