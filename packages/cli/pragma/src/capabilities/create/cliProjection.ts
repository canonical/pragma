/**
 * The `create` module's CLI projection hook — the LIGHT half of the mount.
 *
 * This module is on the capabilities barrel, so `--help` and `__complete`
 * import it on every spawn; it must therefore carry only what those paths
 * actually read: the completion surface and the reference syntax, both
 * derived from the build-time projection (`createSurface.generated.ts`) —
 * the registered flag/positional spellings are BAKED there
 * (`CREATE_CLI_SYNTAX`), so nothing here calls the projection to re-derive a
 * token. The registration machinery itself — summon-core's Commander adapter,
 * the interaction decisions, Commander — lives in `mount.ts` behind the
 * dynamic import `prepare()` performs, which only a caller about to build the
 * command tree ever awaits. The lazy-graph guard in `lazy.test.ts` pins this
 * boundary.
 */

import type { ProjectedPrompt } from "@canonical/summon-core/projection";
import { BIN_NAME } from "../../constants.js";
import type {
  CliMountHost,
  CliProjection,
  CompletionChildFlag,
  CompletionChildSpec,
  ReferenceCliSyntax,
  VerbSpec,
} from "../../kernel/spec/types.js";
import { CREATE_GENERATORS } from "./constants.js";
import {
  CREATE_CLI_SYNTAX,
  CREATE_SURFACE,
} from "./createSurface.generated.js";
import type { CreateKind, PromptCliSyntax } from "./types.js";

/** Build the mount (the module-level CLI projection hook). */
export function createCliProjection(): CliProjection {
  // The registration import is DEFERRED to `prepare()`: only the one caller
  // that actually builds the command tree (the bin, before `buildProgram`)
  // pays for summon-core's adapter and Commander — never the
  // `--help`/`__complete` barrel import. `mount` stays synchronous for
  // `buildProgram` and throws when the step was skipped, so the coupling
  // fails loudly instead of registering an empty subtree.
  let mountCreateTree: typeof import("./mount.js").mountCreateTree | undefined;
  return {
    prepare: async (): Promise<void> => {
      ({ mountCreateTree } = await import("./mount.js"));
    },
    mount: (parent, host: CliMountHost): void => {
      if (!mountCreateTree) {
        throw new Error(
          "create mount used before prepare() — await CliProjection.prepare() before buildProgram",
        );
      }
      mountCreateTree(parent, host);
    },
    completionChildren,
    referenceIntro: REFERENCE_INTRO,
    referenceSyntax,
  };
}

/**
 * The baked registered spelling for a prompt, from the first declared path
 * that carries it (a prompt's spelling derives from its own shape, so every
 * declaring path bakes the same tokens).
 */
function syntaxFor(
  paths: readonly string[],
  promptName: string,
): PromptCliSyntax {
  for (const commandPath of paths) {
    const syntax = CREATE_CLI_SYNTAX[commandPath]?.[promptName];
    if (syntax) return syntax;
  }
  throw new Error(
    `createSurface.generated.ts bakes no CLI syntax for prompt "${promptName}" — rerun the build`,
  );
}

/** The leaves' prompts, unioned by first-seen name (the binding param order). */
function unionPrompts(paths: readonly string[]): ProjectedPrompt[] {
  const seen = new Set<string>();
  const union: ProjectedPrompt[] = [];
  for (const commandPath of paths) {
    for (const prompt of CREATE_SURFACE[commandPath]?.prompts ?? []) {
      if (seen.has(prompt.name)) continue;
      seen.add(prompt.name);
      union.push(prompt);
    }
  }
  return union;
}

/**
 * The REGISTERED reference syntax for one binding verb (the mounted spelling
 * the generated reference prints): the usage line carries the real tree
 * segment (`create application react …`, `<framework>` for the multi-leaf
 * binding — its values live in the Args table) and the registered kebab
 * positional, which is also handed over as the per-param positional token so
 * the Arguments table prints the SAME spelling; each flag token is the one
 * the mount actually registers (a default-true confirm registers ONLY its
 * `--no-` form), read from the BAKED syntax the build derived with the same
 * flag-shape authority the mount registers through. Reached only through
 * {@link createCliProjection} — one seam, THREE consumers, all speaking
 * registration: the kernel's reference emitter (the reference pins read the
 * committed pages it produced), `emitSurface` (the covenant's mounted-noun
 * flag + positional tokens, L-CIS-2), and the `docExamples` gate's
 * valid-token vocabulary. A change of meaning here moves all three together —
 * the covenant conformance and derivation-tie cells in surface.test.ts are
 * the tripwire.
 */
function referenceSyntax(
  verbPath: VerbSpec["path"],
): ReferenceCliSyntax | undefined {
  const kind = verbPath[1] as CreateKind | undefined;
  const binding = kind ? CREATE_GENERATORS[kind] : undefined;
  if (verbPath[0] !== "create" || !binding) return undefined;
  const paths = binding.paths as readonly string[];
  const first = paths[0] as string;

  const tokens: string[] = ["create", kind as string];
  if (paths.length > 1) tokens.push("<framework>");
  else if (first.includes("/")) tokens.push(first.split("/")[1] as string);
  const prompts = unionPrompts(paths);
  const positional = prompts.find((prompt) => prompt.positional === true);
  const positionalTokens: Record<string, string> = {};
  if (positional) {
    const token = `[${syntaxFor(paths, positional.name).kebabName}]`;
    tokens.push(token);
    positionalTokens[positional.name] = token;
  }
  tokens.push("[options]");

  const flagTokens: Record<string, string> = {};
  for (const prompt of prompts) {
    if (prompt.positional === true) continue;
    flagTokens[prompt.name] = syntaxFor(paths, prompt.name).flag;
  }
  return { usage: tokens.join(" "), flagTokens, positionalTokens };
}

/**
 * One leaf's completion node, derived from its projected prompts. EVERY
 * prompt is a flag — `addPromptOptions` registers positional prompts as
 * options too (`--component-path` is as real as `--no-with-styles`), the
 * positional argument being an additional spelling, not a replacement.
 */
function leafChild(label: string, commandPath: string): CompletionChildSpec {
  const surface = CREATE_SURFACE[commandPath];
  const prompts = surface?.prompts ?? [];
  return {
    label,
    flags: prompts.map((prompt) => promptFlag(commandPath, prompt)),
    positionals: prompts
      .filter((prompt) => prompt.positional === true)
      .map((prompt) => ({
        name: prompt.name,
        required: false,
        files: /(path|dir)$/i.test(prompt.name),
      })),
  };
}

/** A prompt's completion flag: the REGISTERED token (`--no-` for default-true). */
function promptFlag(
  commandPath: string,
  prompt: ProjectedPrompt,
): CompletionChildFlag {
  const syntax = syntaxFor([commandPath], prompt.name);
  return {
    flag: syntax.flag,
    takesValue: syntax.takesValue,
    ...(prompt.type === "select" && prompt.choices && prompt.choices.length > 0
      ? { values: prompt.choices.map((choice) => choice.value) }
      : {}),
  };
}

/**
 * The completion surface per verb label: leaves carry their prompt-derived
 * flags in their REGISTERED spelling; a namespace node offers its segment
 * values at position 0, the shared leaf positional after it, and the leaf
 * children for the dynamic tier's precise walk — but NO prompt flags of its
 * own: Commander registers those on the leaves, so a pre-segment offer
 * (`create component --use-ts-stories svelte`) completes an ordering the
 * CLI rejects as an unknown option.
 */
function completionChildren(): Readonly<Record<string, CompletionChildSpec>> {
  const record: Record<string, CompletionChildSpec> = {};
  for (const [kind, binding] of Object.entries(CREATE_GENERATORS)) {
    const paths = binding.paths as readonly string[];
    const first = paths[0] as string;
    if (paths.length === 1 && !first.includes("/")) {
      record[kind] = leafChild(kind, first);
      continue;
    }
    const children = paths.map((commandPath) =>
      leafChild(commandPath.split("/")[1] as string, commandPath),
    );
    // The shared tail: every declared leaf carries the same positional shape.
    const tail = children[0]?.positionals ?? [];
    record[kind] = {
      label: kind,
      flags: [],
      positionals: [
        {
          name: "framework",
          required: true,
          values: children.map((child) => child.label),
        },
        ...tail,
      ],
      children,
    };
  }
  return record;
}

/** The generated-reference intro under the `create` heading (the pointer). */
const REFERENCE_INTRO =
  "The `create` surface is a PROJECTION of the summon generator tree: " +
  `\`${BIN_NAME} create <path...>\` ≡ \`summon <path...>\` over the declared bindings — ` +
  "same grammar, same flags, same wizard, byte-identical trees. Tree segments are " +
  "subcommands (`create component react|svelte|lit`, `create application react`), and " +
  "every flag derives from the generators' own prompts (a default-on confirm registers " +
  "only its `--no-` form). The contract is EXECUTED, not written down: " +
  "`crossCli.subprocess.test.ts` runs both CLIs over the same argv and compares " +
  "what they emit.";
