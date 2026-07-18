/**
 * Build the completion model from the capability modules — the ONE derivation
 * both tiers share: the static scripts inline it, the `__complete` resolver
 * walks it, so the two can never disagree.
 *
 * `ParamSpec.complete` resolution (defaults when the field is absent):
 *
 * | declared        | param kind             | source                     |
 * | --------------- | ---------------------- | -------------------------- |
 * | absent          | enum                   | values (the enum's values) |
 * | absent          | boolean                | none (flag name only)      |
 * | absent          | string/number/string[] | none                       |
 * | `{values}`      | enum only              | values                     |
 * | `{entity,type}` | string/string[]        | entity (dynamic tier)      |
 * | `{files}`       | string/string[]        | files (native shell)       |
 * | `{none}`        | any                    | none                       |
 *
 * Injection safety, primary gate: every token the static tier would inline
 * (nouns, verb labels, flag names, enum values) must match
 * {@link SAFE_TOKEN_RE}; the build THROWS otherwise, so `setup completions`
 * fails loudly and no hostile name ever reaches a shell script. The resolver
 * wraps this in its never-throw guard, so `__complete` degrades to zero
 * candidates instead.
 */

import { DETAIL_LEVELS, OUTPUT_FORMATS } from "../../constants.js";
import { kebabCase, verbLabel } from "../spec/emitSurface.js";
import type { CapabilityModule, ParamSpec, VerbSpec } from "../spec/types.js";
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
  { flag: "--llm", takesValue: false, repeatable: false, source: none() },
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
    case "entity":
      return { kind: "entity", type: declared.type };
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
  if (source.kind === "entity" && source.type !== "") {
    // The type key is never inlined into a script (only entity NAMES are, at
    // runtime, through the same allowlist) — but keep any non-empty type
    // well-formed anyway. An empty type is the legitimate "any entity type"
    // query (`graph inspect`), matched against every entity by the reader.
    assertSafeToken(source.type, `${where} entity type`);
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
        repeatable: param.kind === "string[]",
        source,
      });
    }
  }

  return { label, mutates: verb.capability.mutates, flags, positionals };
}

/** An empty self-verb entry (used for the injected `mcp` noun). */
function bareSelfVerb(label: string): VerbEntry {
  return { label, mutates: false, flags: [], positionals: [] };
}

/**
 * Derive the completion model from the capability modules.
 *
 * Hidden verbs are excluded (matching `emitSurface` and `buildProgram`).
 * The bin-served `mcp` entry is injected so `pragma2 mc<Tab>` completes it,
 * matching the root help.
 * TODO(spec): drop the injection when `mcp` lands as a real (non-hidden) spec.
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
    for (const verb of module.verbs) {
      if (verb.hidden) continue;
      const noun = verb.path[0];
      assertSafeToken(noun, `noun "${noun}"`);
      const bucket = bucketFor(noun);
      const entry = toVerbEntry(verb);
      if (verb.path[1] === undefined) {
        bucket.selfVerb = entry;
      } else {
        bucket.verbs.push(entry);
      }
    }
  }

  if (!byNoun.has("mcp")) {
    byNoun.set("mcp", { selfVerb: bareSelfVerb("mcp"), verbs: [] });
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
