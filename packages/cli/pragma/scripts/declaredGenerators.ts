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
 * TWO CHECKS LIVE HERE, and they answer two different questions a declaration
 * can be wrong about: {@link assertDeclaredGenerators} asks whether the package
 * LINKS, and {@link assertReadsEmbeddedRegistry} asks whether it RUNS from a
 * binary once it has. The second is the claim the deleted `readsEmbeddedTemplates`
 * bit used to make per noun, restated where a fork's package meets it.
 *
 * A BUILD-TIME module, so it lives beside the build. Its first home was
 * `src/capabilities/create/`, which cost it a duplicated declaration type and
 * a paragraph justifying an import discipline nothing there needed — and left
 * the one directory whose whole claim is "nothing here names a generator
 * package" holding a docblock that named one twice.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GeneratorDeclaration } from "../src/kernel/config/types.js";

/**
 * The one entry point a generator may read a template through and still work
 * from a compiled binary. Named here rather than spelled at the grep site so
 * the check and the message cannot disagree.
 */
const EMBEDDED_ENTRY = "@canonical/summon-core/embedded";

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

/**
 * Whether any TypeScript source under a directory mentions a specifier.
 *
 * TEXTUAL on purpose: this runs over a package the build did not write and may
 * not be able to import without evaluating its generation layer, so reading is
 * the only cheap check available.
 *
 * @param dir - The directory to walk.
 * @param specifier - The module specifier to look for.
 * @returns Whether some `.ts` beneath it contains the specifier.
 * @note Impure — reads the declared package's source tree.
 */
function referencesSpecifier(dir: string, specifier: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (referencesSpecifier(path, specifier)) return true;
    } else if (
      entry.name.endsWith(".ts") &&
      readFileSync(path, "utf-8").includes(specifier)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Assert a declared package that SHIPS TEMPLATES reads them through the shared
 * embedded registry.
 *
 * THE THIRD CLAIM, and the one that closes what the deleted gate used to hold
 * shut. `readsEmbeddedTemplates` was a per-noun bit, and it went away on the
 * grounds that it had become universally true — but it became true of the four
 * packages this workspace hand-patched, not of the declared-package SEAM. A
 * fork's generator that calls summon-core's `template({ source })` with no
 * `content:` falls through to `readFile(options.source)`, and in a compiled
 * binary that is `ENOENT … '/$bunfs/…'` AFTER `mkdir` has already left a
 * half-made tree on disk — the exact failure this slice exists to close, behind
 * a green build, a green `check` and a green test run.
 *
 * WHAT IT PROVES AND WHAT IT DOES NOT. It proves the package reaches for the
 * registry at all; it cannot prove every read routes through it (that is a
 * per-call-site fact, and the compiled-binary byte-equality guards are what
 * cover the nouns this distribution ships). It is deliberately scoped to
 * packages the harvest found templates under: a generator that writes only
 * computed content has nothing to embed and nothing to route.
 *
 * @param name - The declared package, for the message.
 * @param srcDir - Its linked source tree.
 * @throws Error naming the package and the binding pattern that satisfies it.
 * @note Impure — reads the declared package's source tree.
 */
export function assertReadsEmbeddedRegistry(
  name: string,
  srcDir: string,
): void {
  if (referencesSpecifier(srcDir, EMBEDDED_ENTRY)) return;
  throw new Error(
    `pragma.conf.ts declares generator "${name}", whose templates this build embedded, but nothing in its sources references "${EMBEDDED_ENTRY}". A generator that reads a template off disk works from a source run and dies from the compiled binary with ENOENT under /$bunfs — after \`mkdir\` has already written a half-made tree. Route every read through the registry: a \`shared/loadTemplate.ts\` binding \`loadEmbeddedSync\` to the package name, and \`template({ source, content: loadTemplateSync(source) })\` at every call site.`,
  );
}
