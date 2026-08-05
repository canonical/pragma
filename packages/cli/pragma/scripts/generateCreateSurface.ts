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
import { fileURLToPath } from "node:url";
import conf from "../pragma.conf.js";

const scriptsUrl = new URL(".", import.meta.url);

/** The declared generator packages, in declaration order. */
const DECLARED = conf.generators;

/** Where the generated value module lands. */
const GENERATORS_OUT = fileURLToPath(
  new URL("../src/capabilities/create/generators.generated.ts", scriptsUrl),
);

/** Where the generated data module lands. */
const SURFACE_OUT = fileURLToPath(
  new URL("../src/capabilities/create/surface.generated.ts", scriptsUrl),
);

/** The shape a generator package exposes: its `generators` map. */
type GeneratorLike = {
  meta: { name: string };
  prompts: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Write a module only when its bytes differ.
 *
 * The generated modules are deterministic, so a rebuild is a working-tree
 * no-op — and no rewrite races a concurrent import (the compiled-binary smoke
 * test rebuilds while sibling create tests run).
 *
 * @param path - The module path.
 * @param body - Its full contents.
 * @returns Whether it was written.
 * @note Impure — writes the filesystem.
 */
function writeWhenChanged(path: string, body: string): boolean {
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
 * Derive one noun's surface entry from its declaration and the live generator.
 *
 * The framework axis is the only branch: `keyPrefix` + `axis` collapses every
 * map key under `<keyPrefix>/` into one verb plus an enum flag, values in MAP
 * ORDER with the first as the default, and the prompt mirror is taken from the
 * first — which is what the hand-written mirror did, by hand, for react.
 *
 * The PATH PARAM is derived here and it is SEC-2 critical: it decides which
 * argument `assertInsideWorkspace` jails. A positional text prompt whose name
 * ends in `path` or `dir` is it; a noun with none is jailed by its own
 * name-derived subdirectory instead. `create.test.ts` pins the derived map
 * against a literal expectation, because a derivation that silently yielded
 * `undefined` would DELETE the jail rather than fail.
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
  declared: {
    key?: string;
    keyPrefix?: string;
    axis?: string;
    summary: string;
    examples?: readonly { cmd: string; note?: string }[];
    optIn?: readonly string[];
    withPrefixed?: readonly string[];
    noDefault?: readonly string[];
  },
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
  const key =
    declared.key ?? `${keyPrefix}/${axisValues.at(0) ?? "<no-axis-values>"}`;
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

  const prompts = generator.prompts
    .filter((prompt) => prompt.name !== axis)
    .map(reducePrompt);

  const pathParam = prompts.find(
    (prompt) =>
      prompt.positional === true &&
      prompt.type === "text" &&
      /(path|dir)$/i.test(String(prompt.name)),
  )?.name;

  return {
    package: packageName,
    key,
    ...(axis !== undefined && keyPrefix !== undefined
      ? { axis, axisValues, keyPrefix }
      : {}),
    summary: declared.summary,
    examples: declared.examples ?? [],
    prompts,
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
 * @returns The nouns generated, in surface order.
 * @note Impure — imports the declared packages and writes two modules.
 */
export async function generateCreateSurface(): Promise<string[]> {
  const surface: Record<string, unknown> = {};
  const importLines: string[] = [];
  const mapEntries: string[] = [];

  for (const [index, declaration] of DECLARED.entries()) {
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

  writeWhenChanged(GENERATORS_OUT, valueModule);
  writeWhenChanged(SURFACE_OUT, dataModule);
  return Object.keys(surface);
}
