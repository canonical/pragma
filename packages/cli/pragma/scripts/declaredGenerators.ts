/**
 * The BUILD's check on `pragma.conf.ts`'s `generators` declaration.
 *
 * THE ASYMMETRY THE CODEGEN EXISTS FOR. `bun build --compile` bundles only
 * statically analysable import specifiers, so a shipped binary can never
 * `import(name)` a declared package. It does not follow — and two
 * implementations of this programme's adjacent issue both concluded it did —
 * that a declaration cannot decide what a compiled binary runs. The BUILD has a
 * filesystem and resolves computed specifiers freely; it can read the
 * declaration and WRITE the literal specifiers the bundler needs. Codegen, not
 * a hand-written mirror, is what closes the gap.
 *
 * What is left for a check, then, is not "do the literals match the
 * declaration" — the build writes both from one source, so they cannot
 * disagree — but "does the declaration match what actually links in". That is
 * the declared name against `package.json`'s `dependencies`: the dependency,
 * not the declaration, is what a package manager installs and a bundler
 * resolves.
 *
 * A BUILD-TIME module, so it lives beside the build. Its first home was
 * `src/capabilities/create/`, which cost it a duplicated declaration type and
 * a paragraph justifying an import discipline nothing there needed — and left
 * the one directory whose whole claim is "nothing here names a generator
 * package" holding a docblock that named one twice.
 */

import type { GeneratorDeclaration } from "../src/kernel/config/types.js";

/**
 * Assert every declared generator package is one this distribution actually
 * depends on.
 *
 * TWO CLAIMS, each about something the build cannot fix for you:
 *  1. the declaration is non-empty — the create surface is generated from it,
 *     so an empty list ships a binary with no create verbs at all;
 *  2. every declared `name` is a key of `dependencies` — because the DEPENDENCY,
 *     not the declaration, is what installs and links. A declaration naming a
 *     package nobody depends on is a build that either fails to resolve or,
 *     worse, resolves through a transitive hoist that a fresh install removes.
 *
 * Claim 2 is UNCONDITIONAL, and that is a correction. The declaration used to
 * carry a `source` string restating `package.json#dependencies`, and the check
 * ran `if (parsed.kind !== "npm") continue;` — so declaring
 * `git+https://example.com/x.git#main` skipped the dependency check entirely and
 * an undeclared package passed. The field's own presence created the hole in
 * the guard that was its only justification, so the field is gone: the installed
 * range is `package.json`'s to state, and the declaration adds nothing by
 * repeating it.
 *
 * @param generators - The declared generator entries.
 * @param dependencies - The target's `package.json#dependencies`.
 * @throws Error naming the entry and the edit that fixes it.
 */
export function assertDeclaredGenerators(
  generators: readonly GeneratorDeclaration[],
  dependencies: Readonly<Record<string, string>>,
): void {
  if (generators.length === 0) {
    throw new Error(
      "pragma.conf.ts declares no `generators`. The create surface is generated from that declaration, so an empty list ships a binary with no create verbs at all — declare at least one package, or delete the create capability.",
    );
  }
  for (const { name } of generators) {
    if (dependencies[name] === undefined) {
      throw new Error(
        `pragma.conf.ts declares generator "${name}", which is not in this package's dependencies. The dependency is what installs the package and what the bundler resolves — add "${name}" to package.json#dependencies.`,
      );
    }
  }
}
