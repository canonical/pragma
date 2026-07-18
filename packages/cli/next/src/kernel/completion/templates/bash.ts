// biome-ignore-all lint/suspicious/noTemplateCurlyInString: bash parameter expansions, not JS templates
/**
 * The bash completion script (static tier). Requires bash >= 4 (mapfile);
 * the package pins os:["linux"], where that floor holds.
 *
 * Structure — nouns, verbs, flag names, enum values — is inlined into
 * generator-validated LITERAL `compgen -W` tables (never a variable, never
 * anything `compgen -W` could evaluate). File params use native `compgen -f`.
 * Only `{kind:"names"}` contexts exec the CLI: `mapfile` ingests
 * `pragma __complete` output line-by-line, so candidates are never
 * word-split or evaluated. That exec is gated by `minChars` (structure + enum
 * values still complete on bare TAB with zero exec). No `eval`, no backticks,
 * `--` guards throughout.
 */

import type { CompletionModel, CompletionSource } from "../types.js";
import {
  globalFlagNames,
  globalValueFlags,
  hasOwnFlags,
  nounNames,
  offeredFlagNames,
  rootFlagNames,
  type VerbView,
  valueFlagNames,
  verbViews,
  wordList,
} from "./shared.js";

/** A shell-safe function-name base for the bin (`pragma` -> `_pragma`). */
function fnBase(binName: string): string {
  return `_${binName.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

/** The bash action completing a value source, or undefined for `none`. */
function sourceAction(
  source: CompletionSource,
  fn: string,
): string | undefined {
  switch (source.kind) {
    case "values":
      return `COMPREPLY=($(compgen -W "${wordList(source.values, "bash values")}" -- "$cur"))`;
    case "files":
      return 'COMPREPLY=($(compgen -f -- "$cur"))';
    case "names":
      return `${fn}_dynamic`;
    case "none":
      return undefined;
  }
}

/** The `noun/verb/--flag` case arms answering flag-value contexts. */
function flagValueArms(model: CompletionModel, fn: string): string[] {
  const arms: string[] = [];
  for (const view of verbViews(model)) {
    for (const flag of view.verb.flags) {
      if (!flag.takesValue) continue;
      const action = sourceAction(flag.source, fn);
      // A known value flag with nothing to offer still returns silently, so
      // its value slot is never mistaken for a positional.
      arms.push(
        `    ${view.key}/${flag.flag}) ${action === undefined ? "return" : `${action}; return`} ;;`,
      );
    }
  }
  return arms;
}

/** The global `--flag` case arms (e.g. --format, --detail values). */
function globalValueArms(model: CompletionModel, fn: string): string[] {
  return globalValueFlags(model).flatMap((flag) => {
    const action = sourceAction(flag.source, fn);
    return action === undefined
      ? []
      : [`    ${flag.flag}) ${action}; return ;;`];
  });
}

/** The `noun/verb` case arms offering per-verb flag names. */
function flagNameArms(model: CompletionModel): string[] {
  return verbViews(model)
    .filter(hasOwnFlags)
    .map(
      (view) =>
        `      ${view.key}) COMPREPLY=($(compgen -W "${wordList(offeredFlagNames(model, view), "bash flags")}" -- "$cur")); return ;;`,
    );
}

/** The `noun` case arms offering sub-verb labels. */
function verbArms(model: CompletionModel): string[] {
  return model.nouns
    .filter((entry) => entry.verbs.length > 0)
    .map(
      (entry) =>
        `      ${entry.noun}) COMPREPLY=($(compgen -W "${wordList(
          entry.verbs.map((verb) => verb.label),
          "bash verbs",
        )}" -- "$cur")); return ;;`,
    );
}

/** The positional case arm for one view, or undefined when it offers nothing. */
function positionalArm(
  model: CompletionModel,
  view: VerbView,
  fn: string,
): string | undefined {
  const slots: string[] = [];
  view.verb.positionals.forEach((positional, index) => {
    const action = sourceAction(positional.source, fn);
    if (action === undefined) return;
    const last = index === view.verb.positionals.length - 1;
    const pattern = positional.variadic && last ? "*" : String(index);
    slots.push(`        ${pattern}) ${action} ;;`);
  });
  if (slots.length === 0) return undefined;
  return [
    `    ${view.key})`,
    `      ${fn}_pos ${view.skipWords} "${wordList(valueFlagNames(model, view), "bash value flags")}"`,
    '      case "$POS" in',
    ...slots,
    "      esac",
    "      ;;",
  ].join("\n");
}

/** Wrap case arms in a `case` statement, or nothing when there are no arms. */
function caseBlock(
  subject: string,
  arms: readonly string[],
  indent: string,
): string[] {
  if (arms.length === 0) return [];
  return [`${indent}case ${subject} in`, ...arms, `${indent}esac`];
}

/**
 * Render the bash completion script.
 *
 * @param model - The completion model.
 * @param binName - The binary to complete (function names derive from it).
 * @param minChars - Minimum typed chars before a name source execs `__complete`.
 * @returns The script text.
 */
export function bashScript(
  model: CompletionModel,
  binName: string,
  minChars: number,
): string {
  const fn = fnBase(binName);
  const positionalArms = verbViews(model).flatMap((view) => {
    const arm = positionalArm(model, view, fn);
    return arm === undefined ? [] : [arm];
  });
  const globalValueSkips = globalValueFlags(model)
    .map((flag) => flag.flag)
    .join("|");
  // Emit the verb block only when there are arms (bash rejects an empty then).
  const verbSection =
    verbArms(model).length === 0
      ? []
      : [
          "",
          "  # verbs",
          '  if [ -z "$verb" ]; then',
          ...caseBlock('"$noun"', verbArms(model), "    "),
          "  fi",
        ];

  const lines = [
    `# ${binName} bash completion (static tier) — generated by \`${binName} setup completions\`. Do not edit.`,
    "# Structure (nouns, verbs, flags, enum values) is inlined and never execs;",
    `# entity arguments call \`${binName} __complete\` (storeless, never-throw);`,
    "# file arguments use native completion. Requires bash >= 4 (mapfile).",
    `${fn}_dynamic() {`,
    ...(minChars > 0 ? [`  [ \${#cur} -ge ${minChars} ] || return 0`] : []),
    `  mapfile -t COMPREPLY < <("${binName}" __complete -- "\${COMP_WORDS[@]:1:COMP_CWORD-1}" "$cur" 2>/dev/null)`,
    "}",
    `${fn}_pos() {`,
    '  local skip="$1" vflags=" $2 " i w',
    "  POS=0",
    "  for ((i = 1; i < COMP_CWORD; i++)); do",
    '    w="${COMP_WORDS[i]}"',
    '    case "$w" in',
    '      -*) case "$vflags" in *" $w "*) ((i++)) ;; esac ;;',
    '      *) if [ "$skip" -gt 0 ]; then skip=$((skip - 1)); else POS=$((POS + 1)); fi ;;',
    "    esac",
    "  done",
    "}",
    `${fn}() {`,
    "  local cur prev noun verb i w POS",
    '  cur="${COMP_WORDS[COMP_CWORD]}"',
    '  prev="${COMP_WORDS[COMP_CWORD-1]}"',
    "  # Normalize the COMP_WORDBREAKS '=' split so a --flag=value context routes",
    "  # as a flag value (mirrors parse.ts). The default breaks split",
    "  # `--flag=val` into `--flag` `=` `val`; a custom COMP_WORDBREAKS may keep",
    "  # `--flag=val` whole. Either way, recover $prev=flag and $cur=value.",
    '  if [[ "$cur" == "=" ]]; then',
    '    cur=""',
    '  elif [[ "$prev" == "=" ]]; then',
    '    prev="${COMP_WORDS[COMP_CWORD-2]}"',
    '  elif [[ "$cur" == --*=* ]]; then',
    '    prev="${cur%%=*}"',
    '    cur="${cur#*=}"',
    "  fi",
    '  noun="" verb="" POS=0',
    "  for ((i = 1; i < COMP_CWORD; i++)); do",
    '    w="${COMP_WORDS[i]}"',
    '    case "$w" in',
    `      ${globalValueSkips}) ((i++)) ;;`,
    "      -*) ;;",
    "      *)",
    '        if [ -z "$noun" ]; then noun="$w"',
    '        elif [ -z "$verb" ]; then verb="$w"',
    "        fi",
    "        ;;",
    "    esac",
    "  done",
    "",
    "  # flag values (verb-scoped, then global)",
    ...caseBlock('"$noun/$verb/$prev"', flagValueArms(model, fn), "  "),
    ...caseBlock('"$prev"', globalValueArms(model, fn), "  "),
    "",
    "  # flag names",
    '  if [[ "$cur" == -* ]]; then',
    ...caseBlock('"$noun/$verb"', flagNameArms(model), "    "),
    '    if [ -z "$noun" ]; then',
    `      COMPREPLY=($(compgen -W "${wordList(rootFlagNames(model), "bash root flags")}" -- "$cur"))`,
    "    else",
    `      COMPREPLY=($(compgen -W "${wordList(globalFlagNames(model), "bash global flags")}" -- "$cur"))`,
    "    fi",
    "    return",
    "  fi",
    "",
    "  # nouns",
    '  if [ -z "$noun" ]; then',
    `    COMPREPLY=($(compgen -W "${wordList(nounNames(model), "bash nouns")}" -- "$cur"))`,
    "    return",
    "  fi",
    ...verbSection,
    "",
    "  # positionals",
    ...caseBlock('"$noun/$verb"', positionalArms, "  "),
    "}",
    `complete -F ${fn} ${binName}`,
    "",
  ];
  return lines.join("\n");
}
