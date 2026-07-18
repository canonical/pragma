// biome-ignore-all lint/suspicious/noTemplateCurlyInString: zsh parameter expansions, not JS templates
/**
 * The zsh completion script (static tier). Requires zsh >= 5.
 *
 * Deliberately a `compadd`-table script, NOT `_arguments` — `_arguments`
 * would interpolate param docs into its spec strings, an injection surface
 * the grammar must never open. Structure is inlined as literal `compadd --`
 * arguments (the `--` guard keeps dash-leading candidates data); files go
 * through `_files`; only `{kind:"names"}` contexts exec the CLI, ingesting
 * `pragma __complete` output via the newline-split `${(f)...}` expansion —
 * candidates are never word-split or evaluated. That exec is gated by
 * `minChars`. No `eval`, no backticks.
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

/** The zsh action completing a value source, or undefined for `none`. */
function sourceAction(
  source: CompletionSource,
  fn: string,
): string | undefined {
  switch (source.kind) {
    case "values":
      return `compadd -- ${wordList(source.values, "zsh values")}`;
    case "files":
      return "_files";
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
      arms.push(
        `    ${view.key}/${flag.flag}) ${action === undefined ? "return 0" : `${action}; return 0`} ;;`,
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
      : [`    ${flag.flag}) ${action}; return 0 ;;`];
  });
}

/** The `noun/verb` case arms offering per-verb flag names. */
function flagNameArms(model: CompletionModel): string[] {
  return verbViews(model)
    .filter(hasOwnFlags)
    .map(
      (view) =>
        `      ${view.key}) compadd -- ${wordList(offeredFlagNames(model, view), "zsh flags")}; return 0 ;;`,
    );
}

/** The `noun` case arms offering sub-verb labels. */
function verbArms(model: CompletionModel): string[] {
  return model.nouns
    .filter((entry) => entry.verbs.length > 0)
    .map(
      (entry) =>
        `      ${entry.noun}) compadd -- ${wordList(
          entry.verbs.map((verb) => verb.label),
          "zsh verbs",
        )}; return 0 ;;`,
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
    `      ${fn}_pos ${view.skipWords} "${wordList(valueFlagNames(model, view), "zsh value flags")}"`,
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
 * Render the zsh completion script.
 *
 * @param model - The completion model.
 * @param binName - The binary to complete (function names derive from it).
 * @param minChars - Minimum typed chars before a name source execs `__complete`.
 * @returns The script text.
 */
export function zshScript(
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
  const verbSection =
    verbArms(model).length === 0
      ? []
      : [
          "",
          "  # verbs",
          '  if [[ -z "$verb" ]]; then',
          ...caseBlock('"$noun"', verbArms(model), "    "),
          "  fi",
        ];

  const lines = [
    `#compdef ${binName}`,
    `# ${binName} zsh completion (static tier) — generated by \`${binName} setup completions\`. Do not edit.`,
    "# Structure (nouns, verbs, flags, enum values) is inlined and never execs;",
    `# entity arguments call \`${binName} __complete\` (storeless, never-throw);`,
    "# file arguments use _files. Requires zsh >= 5.",
    `${fn}_dynamic() {`,
    ...(minChars > 0 ? [`  (( \${#cur} >= ${minChars} )) || return 0`] : []),
    "  local -a _matches",
    `  _matches=("\${(f)$(${binName} __complete -- "\${(@)words[2,CURRENT]}" 2>/dev/null)}")`,
    '  (( ${#_matches[@]} == 1 )) && [[ -z "${_matches[1]}" ]] && return 0',
    '  compadd -- "${_matches[@]}"',
    "}",
    `${fn}_pos() {`,
    '  local skip="$1" vflags=" $2 " w',
    "  local -i i",
    "  POS=0",
    "  for ((i = 2; i < CURRENT; i++)); do",
    '    w="${words[i]}"',
    '    case "$w" in',
    '      -*) [[ "$vflags" == *" $w "* ]] && ((i++)) ;;',
    "      *) if (( skip > 0 )); then (( skip-- )); else (( POS++ )); fi ;;",
    "    esac",
    "  done",
    "}",
    `${fn}() {`,
    "  local cur prev noun verb w",
    "  local -i i POS",
    '  cur="${words[CURRENT]}"',
    '  prev="${words[CURRENT-1]}"',
    "  # Split an inline --flag=value word so the value routes as a flag value",
    "  # (mirrors parse.ts). zsh keeps `--flag=value` as one word, so recover",
    "  # $prev=flag and $cur=value before the flag-value cases below.",
    '  if [[ "$cur" == --*=* ]]; then',
    '    prev="${cur%%=*}"',
    '    cur="${cur#*=}"',
    "  fi",
    '  noun="" verb="" POS=0',
    "  for ((i = 2; i < CURRENT; i++)); do",
    '    w="${words[i]}"',
    '    case "$w" in',
    `      ${globalValueSkips}) ((i++)) ;;`,
    "      -*) ;;",
    "      *)",
    '        if [[ -z "$noun" ]]; then noun="$w"',
    '        elif [[ -z "$verb" ]]; then verb="$w"',
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
    '    if [[ -z "$noun" ]]; then',
    `      compadd -- ${wordList(rootFlagNames(model), "zsh root flags")}`,
    "    else",
    `      compadd -- ${wordList(globalFlagNames(model), "zsh global flags")}`,
    "    fi",
    "    return 0",
    "  fi",
    "",
    "  # nouns",
    '  if [[ -z "$noun" ]]; then',
    `    compadd -- ${wordList(nounNames(model), "zsh nouns")}`,
    "    return 0",
    "  fi",
    ...verbSection,
    "",
    "  # positionals",
    ...caseBlock('"$noun/$verb"', positionalArms, "  "),
    "}",
    `${fn} "$@"`,
    "",
  ];
  return lines.join("\n");
}
