/**
 * The BUILD's reader of `pragma.conf.ts`'s `generators` declaration.
 *
 * The declaration used to be inert: `generators[].name` reached the `create`
 * surface only by hand-copy into `CREATE_GENERATORS`, and `generators[].source`
 * had no reader at all — published as dead in `docs/reference/config.md`. This
 * module is that reader, and the BUILD is where it runs: a declaration that
 * disagrees with what the binary actually links fails `bun run build` instead of
 * shipping a lie. That is the whole of what a `source` string can honestly
 * promise — `bun build --compile` bundles only statically analysable
 * specifiers, so a shipped binary can never resolve a package FROM the
 * declaration at runtime (measured: `Cannot find module
 * '@canonical/summon-component' from '/$bunfs/root/…'`). See
 * {@link assertDeclaredGenerators} for the five claims.
 *
 * PURE, and deliberately import-free: `scripts/build.ts` and `create.test.ts`
 * are its only callers and they do the fs reads, so nothing here needs a module.
 * The import-freedom is NOT a fast-path constraint, as this docblock used to
 * claim: there is no import edge between this module and `create/constants.ts`
 * in either direction, so nothing it imported could reach the fast path.
 * `lazy.test.ts` enumerates that module's graph exactly — four files, this one
 * not among them — and that enumeration is what keeps the two apart. What holds
 * HERE is only build-time purity: raise a plain `Error` naming the file and the
 * edit, the way every message below does.
 */

/**
 * A parsed `generators[].source` ref.
 *
 * TWO ARMS FOR THREE FORMS, because two arms is what anything reads. Only `npm`
 * carries a payload: {@link assertDeclaredGenerators} holds its `name` to the
 * entry's and its `range` to the linked dependency, and `continue`s otherwise.
 * `git+<url>` and `file:<path>` used to be separate bare discriminants, and
 * nothing — not one branch outside a test assertion — ever told them apart, so
 * the type published a three-way choice over a single live decision. Same
 * argument that took `url` and `path` off them, one level up: they carried
 * fields nothing dereferenced, this carried a distinction nothing read. What
 * both forms are checked for is that they PARSE at all, and `other` says that
 * and nothing more.
 *
 * EXPORTED for `create.test.ts`, which unit-tests the parse directly (the
 * scoped-name split has no other observation point); no production module
 * outside this one imports either name.
 */
type ParsedGeneratorSource =
  | { readonly kind: "npm"; readonly name: string; readonly range: string }
  | { readonly kind: "other" };

/**
 * Parse a declared generator `source`.
 *
 * The three forms `packs`/`generators` have always documented: `npm:<spec>`,
 * `git+<url>` and `file:<path>`. The npm arm splits on the LAST `@` so a scoped
 * name (`@canonical/summon-component@^0.33.0`) keeps its leading one; the other
 * two collapse to `other` — see {@link ParsedGeneratorSource}.
 *
 * EXPORTED for `create.test.ts` only, the way `config/schema.ts` exports
 * `rawConfigSchema`.
 *
 * @param source - The declared source string.
 * @returns The parsed ref.
 * @throws Error naming the unparseable source.
 */
export function parseGeneratorSource(source: string): ParsedGeneratorSource {
  if (source.startsWith("npm:")) {
    const spec = source.slice("npm:".length);
    const at = spec.lastIndexOf("@");
    if (at <= 0) {
      throw new Error(
        `generator source "${source}" declares no version range; write npm:<name>@<range>.`,
      );
    }
    return { kind: "npm", name: spec.slice(0, at), range: spec.slice(at + 1) };
  }
  if (source.startsWith("git+") || source.startsWith("file:")) {
    return { kind: "other" };
  }
  throw new Error(
    `generator source "${source}" is not npm:<spec>, git+<url> or file:<path>.`,
  );
}

/**
 * The noun → package-specifier map `pickGenerator.ts` writes STATICALLY.
 *
 * This is the residue the ruling cannot remove: `GENERATOR_MAPS` must name its
 * import specifiers literally or the generators are absent from the compiled
 * binary. Read out of the module's own SOURCE TEXT (never by importing it —
 * importing pulls summon-core), so the build can hold the literals to the
 * declaration they are supposed to mirror.
 *
 * PARSING SOURCE TEXT IS BRITTLE, AND THE DIAGNOSIS SAYS SO. The entry pattern
 * pins two-space indent, the literal `as unknown as GeneratorMap` cast and the
 * trailing comma — a cast the cast's own docblock says exists only until
 * summon's `generate` variance is fixed upstream. Measured: delete that phrase
 * from the three entries and this function returns `{}`, whereupon
 * `assertDeclaredGenerators` reported, per noun, that `pickGenerator.ts` has no
 * static import for it — false, the imports are untouched on lines 1-4, and it
 * sent a builder to add what was already there. So an import block that IS
 * recognised while no entry is fails HERE instead, naming the real cause.
 * `pickGenerator.ts`'s own docblock now records that this reader exists.
 *
 * @param source - `pickGenerator.ts`'s text.
 * @returns Noun → the package specifier its generator map is imported from.
 * @throws Error when the `generators as …` imports parse but no `GENERATOR_MAPS`
 *   entry does — a formatting change, not a missing import.
 */
export function readStaticGeneratorImports(
  source: string,
): Record<string, string> {
  const specifierOf = new Map<string, string>();
  for (const match of source.matchAll(
    /import\s*\{\s*generators as (\w+)\s*\}\s*from\s*"([^"]+)"/g,
  )) {
    const [, local, specifier] = match;
    if (local && specifier) specifierOf.set(local, specifier);
  }
  const bound: Record<string, string> = {};
  for (const match of source.matchAll(
    /^\s{2}(\w+):\s*(\w+) as unknown as GeneratorMap,$/gm,
  )) {
    const [, noun, local] = match;
    const specifier = local === undefined ? undefined : specifierOf.get(local);
    if (noun && specifier) bound[noun] = specifier;
  }
  // Recognised-but-unreadable, both halves: the imports parsed, or the map is
  // there under its own name, and still nothing came out.
  if (
    (specifierOf.size > 0 || source.includes("GENERATOR_MAPS")) &&
    Object.keys(bound).length === 0
  ) {
    throw new Error(
      `could not read GENERATOR_MAPS out of pickGenerator.ts: ${specifierOf.size} generator import(s) parsed and no entry did. This build guard reads that file's SOURCE TEXT, so keep each entry written exactly \`  <noun>: <local> as unknown as GeneratorMap,\` — two-space indent, that cast, trailing comma — and each map imported as \`import { generators as <local> } from "<package>"\`.`,
    );
  }
  return bound;
}

/**
 * The embedded-manifest package `create.verb.ts` statically names.
 *
 * THE FOURTH LITERAL, and the one that was outside the guard. `pickGenerator.ts`
 * writes three specifiers; `create.verb.ts`'s `loadCreateRuntime` writes a
 * fourth — `import("<package>/embedded")` — to inject `setEmbeddedTemplates`
 * before the generators evaluate. It is literal for the same `--compile` reason
 * and it is not interchangeable with the other three: `scripts/build.ts`
 * harvests the `.ejs` for whichever binding declares `readsEmbeddedTemplates`,
 * while this import decides whose loader registry receives them. A fork that
 * followed the reference page, edited `pragma.conf.ts` and `pickGenerator.ts`
 * and stopped got a PASSING build whose binary read templates out of one
 * package's registry and populated another's — surfacing at runtime as the
 * `ENOENT … .ejs` path, misreported by `isModuleNotFound`'s backstop as "run it
 * from a source checkout".
 *
 * Read as SOURCE TEXT, like `readStaticGeneratorImports` and for the same
 * reason: importing `create.verb.ts` pulls the create surface.
 *
 * The `/embedded` suffix is the marker, not the import's position: that module
 * is where summon-component exports `setEmbeddedTemplates`, and a package that
 * exported it from somewhere else would be a different edit than this one.
 *
 * @param source - `create.verb.ts`'s text.
 * @returns The package the `/embedded` submodule is imported from, or
 *   `undefined` when no such dynamic import is written.
 */
export function readEmbeddedManifestImport(source: string): string | undefined {
  for (const match of source.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g)) {
    const specifier = match.at(1);
    if (specifier?.endsWith("/embedded") && !specifier.startsWith(".")) {
      return specifier.slice(0, -"/embedded".length);
    }
  }
  return undefined;
}

/** What {@link assertDeclaredGenerators} checks the declaration against. */
export interface DeclaredGeneratorCheck {
  /** `pragma.conf.ts`'s `generators`, in declaration order. */
  readonly declared: readonly {
    readonly name: string;
    readonly source: string;
  }[];
  /** Noun → package name, as the create surface binds it (`CREATE_GENERATORS`). */
  readonly bound: Readonly<Record<string, string>>;
  /** Noun → package specifier `pickGenerator.ts` statically imports. */
  readonly statics: Readonly<Record<string, string>>;
  /** This package's own `dependencies` — what the build actually links. */
  readonly dependencies: Readonly<Record<string, string>>;
  /** The nouns whose binding declares `readsEmbeddedTemplates`. */
  readonly embeddedNouns: readonly string[];
  /**
   * The package `create.verb.ts` imports `/embedded` from — see
   * {@link readEmbeddedManifestImport}. `undefined` when none is written.
   */
  readonly embeddedFrom: string | undefined;
}

/**
 * Check each declared generator against this package's own dependencies.
 *
 * Claims 1-3: the source parses; an `npm:` source names the same package the
 * entry calls itself; and its range equals `dependencies[name]`, which is what
 * makes `source` load-bearing, since the dependency decides what links in.
 *
 * @param declared - The `generators` entries from `pragma.conf.ts`.
 * @param dependencies - This package's `dependencies` map.
 * @throws Error naming the offending entry and the edit that fixes it.
 */
function assertDeclarationMatchesDependencies(
  declared: DeclaredGeneratorCheck["declared"],
  dependencies: DeclaredGeneratorCheck["dependencies"],
): void {
  for (const entry of declared) {
    // Prefixed with the file, like every other failure this module raises:
    // `parseGeneratorSource` takes a bare string and cannot name the declaration
    // it came from, so its two messages used to be the only ones here that did
    // not begin with the file a builder has to open.
    let parsed: ParsedGeneratorSource;
    try {
      parsed = parseGeneratorSource(entry.source);
    } catch (cause) {
      throw new Error(
        `pragma.conf.ts generator "${entry.name}": ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    if (parsed.kind !== "npm") continue;
    if (parsed.name !== entry.name) {
      throw new Error(
        `pragma.conf.ts generator "${entry.name}" declares source "${entry.source}", which names ${parsed.name}. Make the two agree.`,
      );
    }
    const installed = dependencies[entry.name];
    if (installed === undefined) {
      throw new Error(
        `pragma.conf.ts declares generator ${entry.name}, which is not in this package's dependencies — the build would link nothing for it. Add it, or drop the declaration.`,
      );
    }
    if (installed !== parsed.range) {
      throw new Error(
        `pragma.conf.ts declares ${entry.name}@${parsed.range}; package.json depends on ${installed}. The dependency is what links into the binary, so update the declaration.`,
      );
    }
  }
}

/**
 * Check each bound noun against the declaration and `pickGenerator.ts`.
 *
 * Claim 4: the noun is bound to a DECLARED name, and the static import
 * specifier for that noun is the same string. See
 * {@link assertDeclaredGenerators} for why the first half cannot fail from
 * either live caller.
 *
 * @param declared - The `generators` entries from `pragma.conf.ts`.
 * @param bound - Noun to package name, as the create surface binds it.
 * @param statics - Noun to the literal specifier `pickGenerator.ts` imports.
 * @throws Error naming the offending noun and the edit that fixes it.
 */
function assertBindingsMatchStaticImports(
  declared: DeclaredGeneratorCheck["declared"],
  bound: DeclaredGeneratorCheck["bound"],
  statics: DeclaredGeneratorCheck["statics"],
): void {
  const declaredNames = new Set(declared.map((entry) => entry.name));
  for (const [noun, name] of Object.entries(bound)) {
    if (!declaredNames.has(name)) {
      throw new Error(
        `create ${noun} binds ${name}, which pragma.conf.ts does not declare. Declare it under generators, or rebind the noun.`,
      );
    }
    const specifier = statics[noun];
    if (specifier === undefined) {
      throw new Error(
        `create ${noun} has no static generator import in pickGenerator.ts — a compiled binary would carry no generator for it.`,
      );
    }
    if (specifier !== name) {
      throw new Error(
        `create ${noun} binds ${name} but pickGenerator.ts statically imports ${specifier}. The static specifiers cannot be derived (--compile bundles only literal ones), so the declaration and they must be edited together.`,
      );
    }
  }
}

/**
 * Check the embedded-template loader against the binding.
 *
 * Claim 5, and the one drift the other checks cannot see: `scripts/build.ts`
 * harvests templates for the declaring binding, while `create.verb.ts`'s
 * dynamic `<package>/embedded` import decides whose loader registry receives
 * them.
 *
 * @param bound - Noun to package name, as the create surface binds it.
 * @param embeddedNouns - The nouns declaring `readsEmbeddedTemplates`.
 * @param embeddedFrom - The package named by `create.verb.ts`'s `/embedded`
 *   import, or `undefined` when it writes none.
 * @throws Error naming the offending noun and the edit that fixes it.
 */
function assertEmbeddedManifestMatchesBinding(
  bound: DeclaredGeneratorCheck["bound"],
  embeddedNouns: DeclaredGeneratorCheck["embeddedNouns"],
  embeddedFrom: DeclaredGeneratorCheck["embeddedFrom"],
): void {
  for (const noun of embeddedNouns) {
    const name = bound[noun];
    if (name === undefined) continue;
    if (embeddedFrom === undefined) {
      throw new Error(
        `create ${noun} reads embedded templates but create.verb.ts imports no "<package>/embedded" module — the compiled binary would harvest ${name}'s templates and register them nowhere. Write import("${name}/embedded") in loadCreateRuntime.`,
      );
    }
    if (embeddedFrom !== name) {
      throw new Error(
        `create ${noun} binds ${name} but create.verb.ts injects the embedded manifest into ${embeddedFrom}. scripts/build.ts harvests ${name}'s templates, so the binary would populate the wrong loader and fail reading one. Edit that import with the declaration.`,
      );
    }
  }
}

/**
 * Fail the build when the generator declaration and the shipped binary disagree.
 *
 * Four claims, each with its own failure and its own fix:
 *  1. every declared `source` PARSES — an unreadable ref is a typo, not a
 *     forward-compatible unknown;
 *  2. an `npm:` source names the SAME package as its entry's `name`, so a
 *     declaration cannot point at one package while calling itself another;
 *  3. an `npm:` source's RANGE equals this package's own `dependencies[name]`.
 *     This is what makes `source` load-bearing: the dependency, not the
 *     declaration, decides which generator code links into the binary, so a
 *     version bump that leaves the declaration behind now fails the build
 *     instead of publishing a range nothing installed;
 *  4. every noun the create surface binds is bound to a DECLARED name, and the
 *     static import specifier for that noun is the same string — the residue
 *     check. The binding table zips `generators` POSITIONALLY, so reordering
 *     the declaration would otherwise re-bind every noun silently.
 *
 *     THE FIRST HALF OF 4 CANNOT FAIL FROM EITHER LIVE CALLER. `scripts/
 *     build.ts` and `create.test.ts` both build `bound` by mapping
 *     `CREATE_GENERATORS`, and every `name:` there IS
 *     `conf.generators[i].name` read from the same module instance as
 *     `declared`, so `bound ⊆ declared` holds by construction. It survives to
 *     keep the function total over a hand-written `bound` — which is the only
 *     way `create.test.ts` reaches it. The load-bearing checks are 1-3, the
 *     static-specifier half of 4, and 5.
 *  5. the `<package>/embedded` submodule `create.verb.ts` dynamic-imports is
 *     the package bound to the noun that declares `readsEmbeddedTemplates` —
 *     the FOURTH literal specifier, and the one drift the other checks could
 *     not see. `scripts/build.ts` harvests templates for the declaring binding
 *     while that import decides whose loader registry receives them, so a fork
 *     that edited only `pragma.conf.ts` and `pickGenerator.ts` shipped a
 *     PASSING build whose `create` died reading a template.
 *
 * The five claims are three INDEPENDENT families over three disjoint loops, so
 * they are three functions and this one composes them in order
 * (cs:code.function.composition). That is what lets the embedded-manifest check
 * be exercised without first constructing a fully valid declaration and binding
 * map just to reach it.
 *
 * @param input - The declaration, the bindings, the statics, the dependencies,
 *   and the embedded-manifest import.
 * @throws Error naming the offending entry and the edit that fixes it.
 */
export function assertDeclaredGenerators(input: DeclaredGeneratorCheck): void {
  const { declared, bound, statics, dependencies } = input;
  assertDeclarationMatchesDependencies(declared, dependencies);
  assertBindingsMatchStaticImports(declared, bound, statics);
  assertEmbeddedManifestMatchesBinding(
    bound,
    input.embeddedNouns,
    input.embeddedFrom,
  );
}
