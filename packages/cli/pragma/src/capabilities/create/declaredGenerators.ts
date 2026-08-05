/**
 * The BUILD's reader of `pragma.conf.ts`'s `generators` declaration.
 *
 * THE ASYMMETRY THIS MODULE EXISTS FOR. `bun build --compile` bundles only
 * statically analysable import specifiers, so a shipped binary can never
 * `import(name)` a declared package (measured: `Cannot find module
 * '@canonical/summon-component' from '/$bunfs/root/…'`). It does not follow —
 * and two implementations of this programme's adjacent issue both concluded it
 * did — that a declaration cannot decide what a compiled binary runs. The BUILD
 * has a filesystem and resolves computed specifiers freely; it can read the
 * declaration and WRITE the literal specifiers the bundler needs. Codegen, not
 * a hand-written mirror, is what closes the gap.
 *
 * What is left for a guard, then, is not "do the literals match the
 * declaration" — the build writes both from one source, so they cannot
 * disagree — but "does the declaration match what actually links in". That is
 * `source` against `package.json`'s `dependencies`: the dependency, not the
 * declaration, is what a package manager installs and a bundler resolves.
 *
 * PURE and deliberately import-free: `scripts/build.ts` does the fs reads and
 * calls in, and its failures are plain `Error`s naming the file and the edit.
 */

/**
 * A parsed `generators[].source` ref.
 *
 * Two arms for three forms, because two arms is what anything reads: only `npm`
 * carries a payload the build checks. `git+<url>` and `file:<path>` are held to
 * parsing and nothing more — no reader has ever told them apart.
 */
export type ParsedGeneratorSource =
  | { readonly kind: "npm"; readonly name: string; readonly range: string }
  | { readonly kind: "other" };

/**
 * Parse a declared generator `source`.
 *
 * The npm arm splits on the LAST `@` so a scoped name
 * (`@canonical/summon-component@^0.33.0`) keeps its leading one.
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

/** The declaration shape this module reads (a structural subset of the conf). */
export interface DeclaredGenerator {
  readonly name: string;
  readonly source: string;
}

/**
 * Assert every declared generator package is one this package actually depends
 * on, at the range it declares.
 *
 * THREE CLAIMS, each about something the build cannot fix for you:
 *  1. every `source` parses;
 *  2. an `npm:` source names its OWN entry — a declaration whose name and
 *     source disagree would harvest one package's templates and link another's
 *     module, a green build whose `create` dies at run time;
 *  3. its range equals `dependencies[name]` — because the DEPENDENCY, not the
 *     declaration, is what installs and links. A declaration promising `^2` over
 *     a linked `^1` is a published lie.
 *
 * @param generators - The declared generator entries.
 * @param dependencies - This package's `package.json#dependencies`.
 * @throws Error naming the entry and the edit that fixes it.
 */
export function assertDeclaredGenerators(
  generators: readonly DeclaredGenerator[],
  dependencies: Readonly<Record<string, string>>,
): void {
  if (generators.length === 0) {
    throw new Error(
      "pragma.conf.ts declares no `generators`. The create surface is generated from that declaration, so an empty list ships a binary with no create verbs at all — declare at least one package, or delete the create capability.",
    );
  }
  for (const { name, source } of generators) {
    const parsed = parseGeneratorSource(source);
    if (parsed.kind !== "npm") continue;
    if (parsed.name !== name) {
      throw new Error(
        `pragma.conf.ts declares generator "${name}" with source "${source}", which names "${parsed.name}". The build imports "${name}" and harvests ITS templates, so the two must agree — fix whichever is wrong.`,
      );
    }
    const linked = dependencies[name];
    if (linked === undefined) {
      throw new Error(
        `pragma.conf.ts declares generator "${name}", which is not in this package's dependencies. The dependency is what links into the binary — add "${name}": "${parsed.range}" to package.json#dependencies.`,
      );
    }
    if (linked !== parsed.range) {
      throw new Error(
        `pragma.conf.ts declares generator "${name}" at "${parsed.range}", but package.json#dependencies links "${linked}". The dependency is what installs; the declaration is what is published. Make them agree.`,
      );
    }
  }
}
