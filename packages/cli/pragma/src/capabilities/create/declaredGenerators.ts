/**
 * The BUILD's reader of `pragma.conf.ts`'s `generators` declaration.
 *
 * The declaration used to be inert: `generators[].name` reached the `create`
 * surface only by hand-copy into `CREATE_GENERATORS`, and `generators[].source`
 * had no reader at all — published as dead in `docs/reference/config.md`. This
 * module is that reader, and the BUILD is where it runs: a declaration that
 * disagrees with what the binary actually links fails `bun run build` instead of
 * shipping a lie. That is the whole of what a `source` string can honestly
 * promise —
 * `bun build --compile` bundles only statically analysable specifiers, so a
 * shipped binary can never resolve a package FROM the declaration at runtime
 * (measured: `Cannot find module '@canonical/summon-component' from
 * '/$bunfs/root/…'`). See {@link assertDeclaredGenerators} for the four claims.
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
 * Only the `npm` arm carries a payload, because only the `npm` arm has a reader:
 * {@link assertDeclaredGenerators} holds its `name` to the entry's and its
 * `range` to the linked dependency, and `continue`s on the other two. The `git`
 * and `file` arms are bare discriminants on purpose — they used to carry `url`
 * and `path` fields nothing dereferenced, which is the same dead surface this
 * slice removed from the config (`completion.caseSensitive`) and from the
 * declaration itself (an inert `source`). What those two forms are checked for
 * is that they PARSE at all.
 */
export type ParsedGeneratorSource =
  | { readonly kind: "npm"; readonly name: string; readonly range: string }
  | { readonly kind: "git" }
  | { readonly kind: "file" };

/**
 * Parse a declared generator `source`.
 *
 * The three forms `packs`/`generators` have always documented: `npm:<spec>`,
 * `git+<url>` and `file:<path>`. The npm arm splits on the LAST `@` so a scoped
 * name (`@canonical/summon-component@^0.33.0`) keeps its leading one.
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
  if (source.startsWith("git+")) return { kind: "git" };
  if (source.startsWith("file:")) return { kind: "file" };
  throw new Error(
    `generator source "${source}" is not npm:<spec>, git+<url> or file:<path>.`,
  );
}

/**
 * The noun → package-specifier map `pickGenerator.ts` writes STATICALLY.
 *
 * This is the residue the ruling cannot remove: `GENERATOR_MAPS` must name three
 * import specifiers literally or the generators are absent from the compiled
 * binary. Read out of the module's own SOURCE TEXT (never by importing it —
 * importing pulls summon-core), so the build can hold the literals to the
 * declaration they are supposed to mirror.
 *
 * @param source - `pickGenerator.ts`'s text.
 * @returns Noun → the package specifier its generator map is imported from.
 */
export function readStaticGeneratorImports(
  source: string,
): Record<string, string> {
  const specifierOf = new Map<string, string>();
  for (const match of source.matchAll(
    /import\s*\{\s*generators as (\w+)\s*\}\s*from\s*"([^"]+)"/g,
  )) {
    if (match[1] && match[2]) specifierOf.set(match[1], match[2]);
  }
  const bound: Record<string, string> = {};
  for (const match of source.matchAll(
    /^\s{2}(\w+):\s*(\w+) as unknown as GeneratorMap,$/gm,
  )) {
    const [, noun, local] = match;
    const specifier = local === undefined ? undefined : specifierOf.get(local);
    if (noun && specifier) bound[noun] = specifier;
  }
  return bound;
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
 * @param input - The declaration, the bindings, the statics, the dependencies.
 * @throws Error naming the offending entry and the edit that fixes it.
 */
export function assertDeclaredGenerators(input: DeclaredGeneratorCheck): void {
  const { declared, bound, statics, dependencies } = input;

  for (const entry of declared) {
    // Prefixed with the file, like every other failure this function raises:
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
