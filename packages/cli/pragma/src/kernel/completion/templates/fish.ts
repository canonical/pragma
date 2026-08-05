/**
 * The fish completion script (static tier). Requires fish >= 3.
 *
 * Declarative: one `complete -c` rule per fact, gated by the
 * `__<bin>_at <noun> [verb]` position probe. Default file completion is
 * suppressed (`-f`); enum values are inlined literals; file params force
 * native files back on (`-rF`); only `{kind:"names"}` contexts exec the CLI
 * via a command substitution — fish treats substitution results as literal
 * candidates (split on newlines, never evaluated). Each name POSITIONAL rule
 * ANDs two guards into its condition: `__<bin>_minchars` (wait for `minChars`
 * typed chars) and "the current token is not a flag" (fish evaluates every
 * matching rule, so without it a purely structural `--<TAB>` execs). No `eval`,
 * no backticks.
 *
 * Static-tier coarseness (the resolver is exact): positional value rules are
 * not index-gated, and a mixed self-verb + sub-verb noun only offers its
 * sub-verbs — `__complete` answers both cases precisely.
 */

import type { CompletionModel, FlagEntry, VerbEntry } from "../types.js";
import {
  globalValueFlags,
  nounNames,
  sanitizeBinName,
  verbViews,
  wordList,
} from "./shared.js";

/** AND a `minChars` guard into a name rule's condition (or start one). */
function requireMinChars(
  fn: string,
  condition: string | undefined,
  minChars: number,
): string | undefined {
  if (minChars <= 0) return condition;
  const guard = `${fn}_minchars ${minChars}`;
  return condition ? `${condition}; and ${guard}` : guard;
}

/**
 * AND "the current token is not a flag" into a name rule's condition.
 *
 * The one place fish differs structurally from bash and zsh: those route a
 * completion request through a single exclusive `case` arm, so a `--<TAB>` hits
 * the flag-name arm and nothing else. fish evaluates EVERY `complete` rule
 * whose condition matches the position, so a positional's
 * `-a "(pragma __complete -- …)"` fired alongside the flag-name rules the
 * moment the token cleared `minChars` — and `--` is two characters. Measured:
 * one process spawn per TAB on a flag name, AND the delegate's reply landing in
 * the user's candidate list beside the flags.
 *
 * Composed beside {@link requireMinChars} rather than spelled inline so the two
 * guards read as one policy: a name rule execs only for a long-enough,
 * non-flag token.
 */
function rejectFlagToken(condition: string | undefined): string | undefined {
  const guard = "not string match -q -- '-*' (commandline -ct)";
  return condition ? `${condition}; and ${guard}` : guard;
}

/** The rule fragment completing one flag of a view (or a global flag). */
function flagRule(
  binName: string,
  fn: string,
  condition: string | undefined,
  flag: FlagEntry,
  minChars: number,
): string {
  const name = flag.flag.replace(/^--/, "");
  // A name-source value gates its exec on `minChars`; other rules keep the bare
  // position condition (enum/file/none complete on bare TAB).
  const cond =
    flag.takesValue && flag.source.kind === "names"
      ? requireMinChars(fn, condition, minChars)
      : condition;
  const parts = [`complete -c ${binName}`];
  if (cond) parts.push(`-n "${cond}"`);
  parts.push(`-l ${name}`);
  if (flag.takesValue) {
    switch (flag.source.kind) {
      case "values":
        parts.push(`-x -a "${wordList(flag.source.values, "fish values")}"`);
        break;
      case "files":
        parts.push("-rF");
        break;
      case "names":
        parts.push(
          `-x -a "(${binName} __complete -- (${fn}_words) 2>/dev/null)"`,
        );
        break;
      case "none":
        parts.push("-x");
        break;
    }
  }
  return parts.join(" ");
}

/** The positional value rule for a view, or undefined when it offers nothing. */
function positionalRule(
  binName: string,
  fn: string,
  condition: string,
  verb: VerbEntry,
  minChars: number,
): string | undefined {
  // fish rules are not index-gated; offer the union of the verb's positional
  // sources (a name source delegates to the resolver, which IS index-exact).
  const values = new Set<string>();
  let names = false;
  let files = false;
  for (const positional of verb.positionals) {
    if (positional.source.kind === "values") {
      for (const value of positional.source.values) values.add(value);
    }
    if (positional.source.kind === "names") names = true;
    if (positional.source.kind === "files") files = true;
  }
  // A name source gates its exec on `minChars` AND on the token not being a
  // flag; a values/files positional execs nothing, so it keeps the bare
  // position condition and still completes on bare TAB.
  const cond = names
    ? rejectFlagToken(requireMinChars(fn, condition, minChars))
    : condition;
  const parts = [`complete -c ${binName} -n "${cond}"`];
  if (names) {
    parts.push(`-a "(${binName} __complete -- (${fn}_words) 2>/dev/null)"`);
  } else if (values.size > 0) {
    parts.push(
      `-a "${wordList([...values].sort(), "fish positional values")}"`,
    );
  } else if (files) {
    parts.push("-F");
  } else {
    return undefined;
  }
  return parts.join(" ");
}

/**
 * Render the fish completion script.
 *
 * @param model - The completion model.
 * @param binName - The binary to complete (function names derive from it).
 * @param minChars - Minimum typed chars before a name source execs `__complete`.
 * @returns The script text.
 */
export function fishScript(
  model: CompletionModel,
  binName: string,
  minChars: number,
): string {
  const fn = `__${sanitizeBinName(binName)}`;
  const globalValueSkips = wordList(
    globalValueFlags(model).map((flag) => flag.flag),
    "fish global value flags",
  );

  const lines: string[] = [
    `# ${binName} fish completion (static tier) — generated by \`${binName} setup completions\`. Do not edit.`,
    "# Structure (nouns, verbs, flags, enum values) is inlined and never execs;",
    `# name arguments call \`${binName} __complete\` (storeless, never-throw) once`,
    `# ${minChars} chars are typed; file arguments use native completion (-rF). Requires fish >= 3.`,
    `function ${fn}_words`,
    "    set -l toks (commandline -opc)",
    "    set -l cur (commandline -ct)",
    "    printf '%s\\n' $toks[2..-1] $cur",
    "end",
    ...(minChars > 0
      ? [
          `function ${fn}_minchars`,
          "    test (string length -- (commandline -ct)) -ge $argv[1]",
          "end",
        ]
      : []),
    `function ${fn}_at`,
    "    set -l cmd (commandline -opc)",
    "    set -l noun ''",
    "    set -l verb ''",
    "    set -l skip 0",
    "    for w in $cmd[2..-1]",
    "        if test $skip -eq 1",
    "            set skip 0",
    "            continue",
    "        end",
    "        switch $w",
    `            case ${globalValueSkips}`,
    "                set skip 1",
    "            case '-*'",
    "            case '*'",
    '                if test -z "$noun"',
    "                    set noun $w",
    '                else if test -z "$verb"',
    "                    set verb $w",
    "                end",
    "        end",
    "    end",
    '    test "$noun" = "$argv[1]"; and test "$verb" = "$argv[2]"',
    "end",
    `complete -c ${binName} -f`,
    "",
    "# nouns",
    `complete -c ${binName} -n "${fn}_at ''" -a "${wordList(nounNames(model), "fish nouns")}"`,
    "",
    "# global flags",
    ...model.globalFlags.map((flag) =>
      flagRule(
        binName,
        fn,
        flag.rootOnly === true ? `${fn}_at ''` : undefined,
        flag,
        minChars,
      ),
    ),
  ];

  for (const entry of model.nouns) {
    if (entry.verbs.length > 0) {
      lines.push(
        "",
        `# ${entry.noun} verbs`,
        `complete -c ${binName} -n "${fn}_at ${entry.noun}" -a "${wordList(
          entry.verbs.map((verb) => verb.label),
          "fish verbs",
        )}"`,
      );
    }
  }

  for (const view of verbViews(model)) {
    // A mixed noun's self-verb state is not expressible with the probe; its
    // sub-verbs own the second word and the resolver owns the rest.
    if (
      view.self &&
      view.verb.positionals.length === 0 &&
      view.verb.flags.length === 0 &&
      !view.verb.mutates
    ) {
      continue;
    }
    const nounEntry = model.nouns.find((entry) => entry.noun === view.noun);
    if (view.self && (nounEntry?.verbs.length ?? 0) > 0) continue;

    const condition = view.self
      ? `${fn}_at ${view.noun}`
      : `${fn}_at ${view.noun} ${view.verb.label}`;
    const rules: string[] = [];
    for (const flag of view.verb.flags) {
      rules.push(flagRule(binName, fn, condition, flag, minChars));
    }
    if (view.verb.mutates) {
      for (const flag of model.mutationFlags) {
        rules.push(flagRule(binName, fn, condition, flag, minChars));
      }
    }
    const positional = positionalRule(
      binName,
      fn,
      condition,
      view.verb,
      minChars,
    );
    if (positional) rules.push(positional);
    if (rules.length > 0) {
      lines.push("", `# ${view.key}`, ...rules);
    }
  }

  lines.push("");
  return lines.join("\n");
}
