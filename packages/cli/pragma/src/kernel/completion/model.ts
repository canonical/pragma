/**
 * Build the completion model from the capability modules — the ONE derivation
 * both tiers share: the static scripts inline it, the `__complete` resolver
 * walks it, so the two can never disagree.
 *
 * `ParamSpec.complete` resolution (defaults when the field is absent):
 *
 * | declared         | param kind             | source                     |
 * | ---------------- | ---------------------- | -------------------------- |
 * | absent           | enum                   | values (the enum's values) |
 * | absent           | boolean                | none (flag name only)      |
 * | absent           | string/number/string[] | none                       |
 * | `{values}`       | enum only              | values                     |
 * | `{names,source}` | string/string[]        | names (dynamic tier)       |
 * | `{names,off}`    | any                    | none (opt-out)             |
 * | `{files}`        | string/string[]        | files (native shell)       |
 * | `{none}`         | any                    | none                       |
 *
 * Injection safety, primary gate: every token the static tier would inline
 * (nouns, verb labels, flag names, enum values) must match
 * {@link SAFE_TOKEN_RE}; the build THROWS otherwise, so `setup completions`
 * fails loudly and no hostile name ever reaches a shell script. The resolver
 * wraps this in its never-throw guard, so `__complete` degrades to zero
 * candidates instead.
 */

import { DETAIL_LEVELS, OUTPUT_FORMATS } from "../../constants.js";
import { kebabCase, verbLabel } from "../spec/index.js";
import type {
  CapabilityModule,
  CompletionChildSpec,
  ParamSpec,
  VerbSpec,
} from "../spec/types.js";
import type {
  CompletionModel,
  CompletionSource,
  FlagEntry,
  NounEntry,
  PositionalEntry,
  VerbEntry,
} from "./types.js";

/**
 * The allowlist every inlined completion token must match: an alphanumeric
 * head, then word/URI-ish characters. No whitespace, quotes, `$`, backticks,
 * semicolons, or globs — nothing a shell could expand or split.
 *
 * KNOWN GAP, deliberately not closed: it admits shell RESERVED WORDS — `esac`,
 * `in`, `do`, `done`, `fi`. A noun so named emits a `case` arm bash and zsh both
 * refuse to parse, so `_pragma` is never defined and the user gets NO completion
 * at all rather than a wrong candidate (`fish -n` does not catch it either). The
 * gap is owned by the syntax gates, not by this regex: `shellDrive.test.ts`
 * runs `bash -n`/`zsh -n` over the emitted scripts, so the day a live noun is
 * named `done` the build fails loudly and names the file. A denylist here would
 * be new production code guarding a case nothing in the tree exhibits — and a
 * partial one (reserved words differ across families and versions) reads as
 * more protection than it gives.
 */
export const SAFE_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9@/:._+-]*$/;

/**
 * Assert a token is safe to inline in a shell script.
 *
 * @param token - The candidate token (a noun, verb label, flag name, value).
 * @param where - Human-readable location for the error message.
 * @throws Error when the token fails the {@link SAFE_TOKEN_RE} allowlist.
 */
export function assertSafeToken(token: string, where: string): void {
  if (!SAFE_TOKEN_RE.test(token)) {
    throw new Error(
      `completion: unsafe token ${JSON.stringify(token)} in ${where} — ` +
        `must match ${String(SAFE_TOKEN_RE)}`,
    );
  }
}

/** The global flags completion offers, mirroring the surface's globalFlags. */
const GLOBAL_FLAGS: readonly FlagEntry[] = [
  {
    flag: "--format",
    takesValue: true,
    repeatable: false,
    source: { kind: "values", values: OUTPUT_FORMATS },
  },
  { flag: "--verbose", takesValue: false, repeatable: false, source: none() },
  {
    flag: "--detail",
    takesValue: true,
    repeatable: false,
    source: { kind: "values", values: DETAIL_LEVELS },
  },
  {
    flag: "--no-headers",
    takesValue: false,
    repeatable: false,
    source: none(),
  },
  { flag: "--quiet", takesValue: false, repeatable: false, source: none() },
  { flag: "--help", takesValue: false, repeatable: false, source: none() },
  {
    flag: "--version",
    takesValue: false,
    repeatable: false,
    rootOnly: true,
    source: none(),
  },
];

/** The flags auto-injected for `mutates` verbs (mirrors `buildProgram`). */
const MUTATION_FLAGS: readonly FlagEntry[] = [
  { flag: "--dry-run", takesValue: false, repeatable: false, source: none() },
  { flag: "--undo", takesValue: false, repeatable: false, source: none() },
  { flag: "--yes", takesValue: false, repeatable: false, source: none() },
];

/** The `{kind:"none"}` source (shared instance). */
function none(): CompletionSource {
  return { kind: "none" };
}

/**
 * Resolve a param's completion source from `ParamSpec.complete` + its kind
 * (the table in the module docblock).
 */
function resolveSource(param: ParamSpec): CompletionSource {
  const declared = param.complete;
  if (declared === undefined) {
    return param.kind === "enum"
      ? { kind: "values", values: param.values }
      : none();
  }
  switch (declared.kind) {
    case "values":
      // The zod refinement makes {values} on a non-enum unregistrable; the
      // model mirrors the rule structurally rather than trusting call order.
      return param.kind === "enum"
        ? { kind: "values", values: param.values }
        : none();
    case "names":
      // The per-family opt-out (`enabled:false`) collapses to no completion.
      if (declared.enabled === false) return none();
      return {
        kind: "names",
        ref: declared.source,
        match: declared.match ?? "substring",
        caseSensitive: declared.caseSensitive ?? false,
      };
    case "files":
      return { kind: "files" };
    case "none":
      return none();
  }
}

/** Assert the safety of every token a source could inline statically. */
function assertSafeSource(source: CompletionSource, where: string): void {
  if (source.kind === "values") {
    for (const value of source.values) {
      assertSafeToken(value, `${where} value`);
    }
  }
  if (source.kind === "names" && source.ref.type && source.ref.type !== "") {
    // The type key is never inlined into a script (only NAMES are, at runtime,
    // through the same allowlist) — but keep any non-empty type well-formed
    // anyway. An empty/absent type is the legitimate "any type" query (`graph
    // inspect`), matched against every entity by the index reader.
    assertSafeToken(source.ref.type, `${where} names type`);
  }
}

/** Project one verb spec into its completion entry, asserting name safety. */
function toVerbEntry(verb: VerbSpec): VerbEntry {
  const label = verbLabel(verb.path);
  assertSafeToken(label, `verb "${verb.path.join(" ")}"`);

  const flags: FlagEntry[] = [];
  const positionals: PositionalEntry[] = [];
  for (const param of verb.params) {
    const source = resolveSource(param);
    if (param.positional) {
      assertSafeSource(source, `positional "${param.name}"`);
      positionals.push({
        name: param.name,
        required: param.required === true,
        variadic: param.kind === "string[]",
        source,
      });
    } else {
      const name = kebabCase(param.name);
      assertSafeToken(name, `flag "--${name}"`);
      assertSafeSource(source, `flag "--${name}"`);
      flags.push({
        flag: `--${name}`,
        takesValue: param.kind !== "boolean",
        // Two grammars accumulate, so two shapes are repeatable: a `string[]`
        // flag (`--tag a --tag b`) and any `string`/`enum` param the spec
        // marks `repeatable` — the form compiled packs give every declared
        // filter. Reading only the kind de-offered a filter after its first
        // use, hiding the repetition the parser had just started honouring.
        repeatable: param.kind === "string[]" || param.repeatable === true,
        source,
      });
    }
  }

  return { label, mutates: verb.capability.mutates, flags, positionals };
}

/**
 * Convert one module-declared completion node (a mounted subtree's static
 * data) into a verb entry, asserting every inlinable token's safety exactly
 * as spec-derived entries are asserted. `mutates` is the owning verb's
 * mutability, applied only to the LEAVES (see the namespace note below).
 */
function toMountedEntry(
  spec: CompletionChildSpec,
  mutates: boolean,
  where: string,
): VerbEntry {
  assertSafeToken(spec.label, `${where} label`);
  const flags: FlagEntry[] = spec.flags.map((flag) => {
    const name = flag.flag.replace(/^--?/, "");
    assertSafeToken(name, `${where} flag "${flag.flag}"`);
    const source: CompletionSource = flag.values
      ? { kind: "values", values: flag.values }
      : none();
    assertSafeSource(source, `${where} flag "${flag.flag}"`);
    return {
      flag: flag.flag,
      takesValue: flag.takesValue,
      repeatable: false,
      source,
    };
  });
  const positionals: PositionalEntry[] = spec.positionals.map((positional) => {
    const source: CompletionSource = positional.values
      ? { kind: "values", values: positional.values }
      : positional.files
        ? { kind: "files" }
        : none();
    assertSafeSource(source, `${where} positional "${positional.name}"`);
    return {
      name: positional.name,
      required: positional.required,
      variadic: false,
      source,
    };
  });
  const children =
    spec.children && spec.children.length > 0
      ? spec.children.map((child) =>
          toMountedEntry(child, mutates, `${where}/${child.label}`),
        )
      : undefined;
  return {
    label: spec.label,
    // A node with children is a NAMESPACE, not a runnable command:
    // `registerGeneratorCommands` adds the host mutation trio to runnable
    // LEAVES only, so a mutating namespace would offer `--dry-run`/`--undo`/
    // `--yes` BEFORE the framework segment — an ordering the CLI rejects as
    // an unknown option. The verb's mutability descends to the leaves.
    mutates: children ? false : mutates,
    flags,
    positionals,
    ...(children ? { children } : {}),
  };
}

/**
 * Derive the completion model from the capability modules.
 *
 * Hidden verbs are excluded (matching `emitSurface` and `buildProgram`).
 * Every noun in the model comes from a declared verb — `mcp` used to be
 * injected here because the bin served it without a spec, and it now declares
 * `mcp serve` like any other pair.
 *
 * @param modules - The capability modules.
 * @returns The completion model, nouns and verbs sorted.
 * @throws Error when any inlined token fails the safety allowlist.
 */
export function buildCompletionModel(
  modules: readonly CapabilityModule[],
): CompletionModel {
  const byNoun = new Map<
    string,
    { selfVerb?: VerbEntry; verbs: VerbEntry[] }
  >();
  const bucketFor = (
    noun: string,
  ): { selfVerb?: VerbEntry; verbs: VerbEntry[] } => {
    const existing = byNoun.get(noun);
    if (existing) return existing;
    const created: { selfVerb?: VerbEntry; verbs: VerbEntry[] } = { verbs: [] };
    byNoun.set(noun, created);
    return created;
  };

  for (const module of modules) {
    // A module-owned mount REPLACES its verbs' completion surface: the flags
    // the mounted tree actually registers (e.g. a default-on confirm's
    // `--no-` form), the segment positionals, and the child walk — declared
    // as static data by the module, converted and safety-asserted here.
    const mountedChildren = module.cliProjection?.completionChildren();
    for (const verb of module.verbs) {
      if (verb.hidden) continue;
      const noun = verb.path[0];
      assertSafeToken(noun, `noun "${noun}"`);
      const bucket = bucketFor(noun);
      const mountedSpec = mountedChildren?.[verbLabel(verb.path)];
      const entry = mountedSpec
        ? toMountedEntry(
            mountedSpec,
            verb.capability.mutates,
            `mounted "${verb.path.join(" ")}"`,
          )
        : toVerbEntry(verb);
      if (verb.path[1] === undefined) {
        bucket.selfVerb = entry;
      } else {
        bucket.verbs.push(entry);
      }
    }
  }

  const nouns: NounEntry[] = [...byNoun.entries()]
    .map(([noun, bucket]) => ({
      noun,
      ...(bucket.selfVerb ? { selfVerb: bucket.selfVerb } : {}),
      verbs: [...bucket.verbs].sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.noun.localeCompare(b.noun));

  return { nouns, globalFlags: GLOBAL_FLAGS, mutationFlags: MUTATION_FLAGS };
}

/**
 * Look up a noun's entry in the model.
 *
 * @param model - The completion model.
 * @param noun - The noun token.
 * @returns The entry, or `undefined` for an unknown noun.
 */
export function findNoun(
  model: CompletionModel,
  noun: string,
): NounEntry | undefined {
  return model.nouns.find((entry) => entry.noun === noun);
}
