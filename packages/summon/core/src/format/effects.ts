/**
 * Effect formatting utilities for CLI output.
 *
 * Moved into summon-core (from the v1 cli-core `formatEffects`) so both the
 * summon bin and the pragma kernel share one effect-formatting surface without
 * either importing the other. The pragma `create` render layer reuses these
 * helpers to project a {@link GeneratorResult}. Both bins now import them from
 * HERE — the cli-core re-export shim went with that package.
 */

import * as path from "node:path";
import type { Effect } from "@canonical/task";
import chalk from "chalk";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import type PromptDefinition from "../types/PromptDefinition.js";
import formatFlagName from "./formatFlagName.js";

// Fixed width for action label column
const ACTION_LABEL_WIDTH = 14;

/**
 * Filter effects to only show user-relevant ones (not internal effects).
 * @param effect - The effect to check
 * @param verbose - If true, include debug logs
 */
export const isVisibleEffect = (effect: Effect, verbose = false): boolean => {
  switch (effect._tag) {
    case "WriteFile":
    case "AppendFile":
    // A TransformFile REWRITES a file the run already owns — `isWriteEffect`
    // counts it and `getAffectedPaths` names its path, so a plan that omitted
    // it hid a real mutation. It reached the default arm for as long as that
    // arm claimed an exhaustiveness it did not have; the `never` below is what
    // stops the next tag added to `@canonical/task` from repeating that.
    case "TransformFile":
    case "MakeDir":
    case "CopyFile":
    case "CopyDirectory":
    case "DeleteFile":
    case "DeleteDirectory":
    case "Exec":
    case "Symlink":
      return true;
    case "Log":
      // Filter out debug logs unless verbose is enabled
      if (effect.level === "debug") {
        return verbose;
      }
      return true;
    // Internal effects are not shown
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return false;
    /* v8 ignore start — unreachable: the arms above cover every `Effect`
       tag, which the `never` assignment enforces at COMPILE time rather than
       asserting in prose. Adding a tag to `@canonical/task` fails `tsc` here. */
    default: {
      const _exhaustive: never = effect;
      return false;
    }
    /* v8 ignore stop */
  }
};

/**
 * The rows a plan shows: the user-relevant effects, each directory named once.
 *
 * The visibility filter and the `MakeDir` de-duplication are ONE rule with
 * several readers — the summon bin's dry-run, the `--llm` / `--format json`
 * projections below, and the pragma kernel's CLI and MCP previews — and each
 * reader used to carry its own copy of the two steps. A generator that ensures
 * its output directory before every file plans that directory once per file,
 * so the de-duplication is what makes a plan a list of artifacts rather than a
 * list of mkdir calls.
 *
 * @param effects - The effects a run would apply, in order.
 * @param verbose - If true, debug logs stay in the plan.
 * @returns The visible effects, first occurrence of each directory kept.
 */
export const visiblePlanEffects = (
  effects: readonly Effect[],
  verbose = false,
): Effect[] => {
  const seenDirPaths = new Set<string>();
  return effects.filter((effect) => {
    if (!isVisibleEffect(effect, verbose)) return false;
    if (effect._tag === "MakeDir") {
      if (seenDirPaths.has(effect.path)) return false;
      seenDirPaths.add(effect.path);
    }
    return true;
  });
};

/**
 * The colour decision a row is rendered under, carried as DATA.
 *
 * {@link formatEffectLine} used to call `chalk` directly, which meant whether a
 * row carried ANSI was decided by chalk's environment detection at the moment
 * of the call. Two of its callers cannot live with that: pragma's CLI preview
 * gates colour on `process.stdout.isTTY` AND chalk's level (so a piped run
 * under `FORCE_COLOR` — which nx exports to every test task — must stay plain
 * while chalk alone would colour it), and the MCP plan payload is structured
 * data read by a model, which must be plain whatever the editor that spawned
 * the server put in the environment.
 *
 * So the decision arrives as an argument. Stripping escapes afterwards would
 * work too and would be wrong: it puts the rule in a second place.
 */
export interface EffectStyle {
  /** Whether this style emits ANSI at all. */
  readonly enabled: boolean;
  /** De-emphasize a connector or indent. */
  dim(text: string): string;
  /** Tint an action label, or pass it through when the effect has no colour. */
  paint(color: EffectColor | undefined, text: string): string;
}

/** The colours {@link getActionColor} may ask for. */
export type EffectColor =
  | "green"
  | "red"
  | "yellow"
  | "cyan"
  | "blue"
  | "magenta";

/** The identity styler — every function returns its input unchanged. */
const PLAIN_EFFECT_STYLE: EffectStyle = {
  enabled: false,
  dim: (text) => text,
  paint: (_color, text) => text,
};

/**
 * Build an {@link EffectStyle} for a known colour decision.
 *
 * @param enabled - True to colour through chalk; false for the identity
 *   styler, which emits no escape under any environment.
 * @returns A style whose functions colour, or pass through, accordingly.
 */
export const effectStyleFor = (enabled: boolean): EffectStyle => {
  if (!enabled) return PLAIN_EFFECT_STYLE;
  return {
    enabled: true,
    dim: (text) => chalk.dim(text),
    paint: (color, text) => (color ? chalk[color](text) : text),
  };
};

/**
 * The default style: chalk's own ambient decision.
 *
 * Kept as the default argument so the summon bin — which has always rendered
 * under exactly this — stays byte-identical. A host with its own colour gate
 * passes {@link effectStyleFor} instead of inheriting this one.
 */
const AMBIENT_EFFECT_STYLE: EffectStyle = effectStyleFor(true);

/**
 * Get human-readable action label for an effect.
 */
export const getActionLabel = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
      return "Create file";
    case "AppendFile":
      return "Append to";
    case "TransformFile":
      return "Transform";
    case "MakeDir":
      return "Create dir";
    case "CopyFile":
      return "Copy file";
    case "CopyDirectory":
      return "Copy dir";
    case "DeleteFile":
      return "Delete file";
    case "DeleteDirectory":
      return "Delete dir";
    case "Exec":
      return "Execute";
    case "Symlink":
      return "Symlink";
    case "Log":
      switch (effect.level) {
        case "debug":
          return "Debug";
        case "info":
          return "Info";
        case "warn":
          return "Warning";
        case "error":
          return "Error";
        default:
          return "Log";
      }
    // The internal effects: never rendered as a plan row (isVisibleEffect
    // drops them), but named here so the switch is exhaustive over the tag
    // union rather than leaning on a default that hides a missing case.
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return effect._tag;
    /* v8 ignore start — unreachable; `never` proves the arms above are total */
    default: {
      const _exhaustive: never = effect;
      return "";
    }
    /* v8 ignore stop */
  }
};

/**
 * Get color for action label based on effect type.
 */
export const getActionColor = (effect: Effect): EffectColor | undefined => {
  switch (effect._tag) {
    case "WriteFile":
    case "MakeDir":
      return "green";
    case "AppendFile":
    case "TransformFile":
      return "magenta";
    case "DeleteFile":
    case "DeleteDirectory":
      return "red";
    case "CopyFile":
    case "CopyDirectory":
      return "cyan";
    case "Exec":
      return "yellow";
    case "Symlink":
      return "cyan";
    case "Log":
      switch (effect.level) {
        case "error":
          return "red";
        case "warn":
          return "yellow";
        case "debug":
          return undefined; // dim by default
        default:
          return "blue";
      }
    // Internal effects — uncoloured, and named for exhaustiveness (above).
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return undefined;
    /* v8 ignore start — unreachable; `never` proves the arms above are total */
    default: {
      const _exhaustive: never = effect;
      return undefined;
    }
    /* v8 ignore stop */
  }
};

/**
 * Get the payload (description) for an effect.
 */
export const getEffectPayload = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
      return effect.path;
    case "AppendFile":
      return effect.path;
    case "TransformFile":
      return effect.path;
    case "MakeDir":
      return effect.path;
    case "CopyFile":
      return `${effect.source} → ${effect.dest}`;
    case "CopyDirectory":
      return `${effect.source}/ → ${effect.dest}/`;
    case "DeleteFile":
    case "DeleteDirectory":
      return effect.path;
    case "Exec":
      return `${effect.command} ${effect.args.join(" ")}`;
    case "Symlink":
      return `${effect.target} → ${effect.path}`;
    case "Log":
      return effect.message;
    // Internal effects — named for exhaustiveness (see getActionLabel).
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return effect._tag;
    /* v8 ignore start — unreachable; `never` proves the arms above are total */
    default: {
      const _exhaustive: never = effect;
      return "";
    }
    /* v8 ignore stop */
  }
};

/**
 * Format a single effect as a CLI line (for non-interactive output).
 *
 * @param effect - The effect to name.
 * @param isLast - True for the final row, which closes the tree connector.
 * @param style - The colour decision. Defaults to chalk's ambient one, which
 *   is what the summon bin has always rendered under; a host with its own gate
 *   passes {@link effectStyleFor} so the row cannot disagree with the rest of
 *   that host's output.
 * @returns The rendered row.
 */
export const formatEffectLine = (
  effect: Effect,
  isLast: boolean,
  style: EffectStyle = AMBIENT_EFFECT_STYLE,
): string => {
  const connector = isLast ? "└─" : "├─";
  const actionLabel = getActionLabel(effect);
  const color = getActionColor(effect);
  const payload = getEffectPayload(effect);

  const paddedLabel = actionLabel.padEnd(ACTION_LABEL_WIDTH);

  return `${style.dim(connector)} ${style.paint(color, paddedLabel)}${payload}`;
};

/**
 * Maximum number of lines to show in content preview.
 */
const MAX_PREVIEW_LINES = 50;

/**
 * Maximum width for content lines (will truncate).
 */
const MAX_LINE_WIDTH = 120;

/**
 * Format file content for preview display.
 * Shows line numbers and truncates long content.
 *
 * @param content - The file content to format
 * @param maxLines - Maximum number of lines to show (default: MAX_PREVIEW_LINES)
 */
export const formatContentPreview = (
  content: string,
  maxLines: number = MAX_PREVIEW_LINES,
  style: EffectStyle = AMBIENT_EFFECT_STYLE,
): string => {
  const lines = content.split("\n");
  const totalLines = lines.length;
  const showLines = lines.slice(0, maxLines);
  const lineNumWidth = String(Math.min(totalLines, maxLines)).length;

  const formatted = showLines.map((line, i) => {
    const lineNum = String(i + 1).padStart(lineNumWidth, " ");
    const truncatedLine =
      line.length > MAX_LINE_WIDTH
        ? `${line.slice(0, MAX_LINE_WIDTH - 3)}...`
        : line;
    return `${style.dim(`${lineNum} │`)} ${truncatedLine}`;
  });

  if (totalLines > maxLines) {
    formatted.push(
      style.dim(`   ... (${totalLines - maxLines} more lines omitted)`),
    );
  }

  return formatted.join("\n");
};

/**
 * Format an effect with its content (for verbose dry-run mode).
 * This is useful for LLM agents that need to see generated file contents.
 *
 * @param effect - The effect to format
 * @param isLast - Whether this is the last effect in the list
 */
export const formatEffectWithContent = (
  effect: Effect,
  isLast: boolean,
  style: EffectStyle = AMBIENT_EFFECT_STYLE,
): string => {
  const baseLine = formatEffectLine(effect, isLast, style);

  // Only show content for WriteFile and AppendFile effects
  if (effect._tag === "WriteFile" || effect._tag === "AppendFile") {
    const indent = isLast ? "   " : "│  ";
    const contentPreview = formatContentPreview(
      effect.content,
      MAX_PREVIEW_LINES,
      style,
    );
    const indentedContent = contentPreview
      .split("\n")
      .map((line) => `${style.dim(indent)}${line}`)
      .join("\n");
    return `${baseLine}\n${indentedContent}`;
  }

  return baseLine;
};

// =============================================================================
// LLM Output Formatting
// =============================================================================

/**
 * Map file extension to markdown code fence language hint.
 */
export const getLanguageHint = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".jsx": "jsx",
    ".mjs": "js",
    ".cjs": "js",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".less": "less",
    ".html": "html",
    ".htm": "html",
    ".xml": "xml",
    ".svg": "svg",
    ".vue": "vue",
    ".svelte": "svelte",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".md": "md",
    ".mdx": "mdx",
    ".sh": "sh",
    ".bash": "bash",
    ".zsh": "zsh",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".php": "php",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".dockerfile": "dockerfile",
    ".tf": "hcl",
  };
  return map[ext] ?? "";
};

/**
 * Get the plain-text action label for an effect (for LLM output).
 */
export const getLlmActionLabel = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
      return "create";
    case "AppendFile":
      return "append";
    case "TransformFile":
      return "transform";
    case "MakeDir":
      return "mkdir";
    case "CopyFile":
      return "copy";
    case "CopyDirectory":
      return "copy-dir";
    case "DeleteFile":
      return "delete";
    case "DeleteDirectory":
      return "rmdir";
    case "Exec":
      return "exec";
    case "Symlink":
      return "symlink";
    case "Log":
      return effect.level;
    // Internal effects — named for exhaustiveness (see getActionLabel).
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return effect._tag.toLowerCase();
    /* v8 ignore start — unreachable; `never` proves the arms above are total */
    default: {
      const _exhaustive: never = effect;
      return "";
    }
    /* v8 ignore stop */
  }
};

/**
 * Get the path/description for an effect (plain text, for LLM output).
 */
export const getLlmEffectPath = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
    case "AppendFile":
    case "TransformFile":
    case "MakeDir":
    case "DeleteFile":
    case "DeleteDirectory":
      return effect.path;
    case "CopyFile":
      return `${effect.source} -> ${effect.dest}`;
    case "CopyDirectory":
      return `${effect.source}/ -> ${effect.dest}/`;
    case "Exec":
      return `${effect.command} ${effect.args.join(" ")}`;
    case "Symlink":
      return `${effect.target} -> ${effect.path}`;
    case "Log":
      return effect.message;
    // Internal effects — no path to name, and named for exhaustiveness.
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return "";
    /* v8 ignore start — unreachable; `never` proves the arms above are total */
    default: {
      const _exhaustive: never = effect;
      return "";
    }
    /* v8 ignore stop */
  }
};

/**
 * Build the replay command string from generator name and answers.
 */
/**
 * Quote a replay-command value for a POSIX shell when it needs it — a value
 * with spaces or shell metacharacters previously produced a broken command in
 * every `--llm` "To execute" line.
 */
const quoteShellValue = (value: string): string =>
  /^[A-Za-z0-9_@%+=:,./-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", `'\\''`)}'`;

export const buildReplayCommand = (
  generatorName: string,
  answers: Record<string, unknown>,
  prompts: PromptDefinition[],
): string => {
  const parts = ["summon", generatorName];

  for (const prompt of prompts) {
    const value = answers[prompt.name];
    if (value === undefined) continue;

    const kebabName = formatFlagName(prompt.name);

    if (prompt.type === "confirm") {
      if (value === true && prompt.default !== true) {
        parts.push(`--${kebabName}`);
      } else if (value === false && prompt.default === true) {
        parts.push(`--no-${kebabName}`);
      }
    } else if (prompt.type === "multiselect" && Array.isArray(value)) {
      if (value.length > 0) {
        parts.push(`--${kebabName}`, quoteShellValue(value.join(",")));
      }
    } else {
      parts.push(`--${kebabName}`, quoteShellValue(String(value)));
    }
  }

  parts.push("--yes");
  return parts.join(" ");
};

/**
 * Format the full LLM output as a markdown document.
 *
 * Produces a clean, structured markdown document with:
 * - Generator metadata as heading + blockquote
 * - Answers as a table
 * - Plan as a table with action, path, line count
 * - File contents in fenced code blocks with language hints
 * - Replay command at the end
 */
export const formatLlmMarkdown = (
  generator: GeneratorDefinition,
  answers: Record<string, unknown>,
  effects: Effect[],
  verbose = false,
): string => {
  const lines: string[] = [];

  // Header — use generator meta name directly (binary-agnostic)
  lines.push(`# ${generator.meta.name}`);
  lines.push("");
  lines.push(`> ${generator.meta.description}`);
  lines.push(`> v${generator.meta.version}`);
  lines.push("");

  // Answers table
  const answerEntries = Object.entries(answers);
  if (answerEntries.length > 0) {
    lines.push("## Answers");
    lines.push("");
    lines.push("| Option | Value |");
    lines.push("|--------|-------|");
    for (const [key, value] of answerEntries) {
      const displayValue = Array.isArray(value)
        ? value.join(", ")
        : String(value);
      lines.push(`| ${key} | ${displayValue} |`);
    }
    lines.push("");
  }

  // The one plan rule: visible effects, each directory named once.
  const dedupedEffects = visiblePlanEffects(effects, verbose);

  // Plan table
  if (dedupedEffects.length > 0) {
    lines.push("## Plan");
    lines.push("");
    lines.push("| Action | Path | Lines |");
    lines.push("|--------|------|-------|");
    for (const effect of dedupedEffects) {
      const action = getLlmActionLabel(effect);
      const effectPath = getLlmEffectPath(effect);
      const lineCount =
        effect._tag === "WriteFile" || effect._tag === "AppendFile"
          ? String(effect.content.split("\n").length)
          : "";
      lines.push(`| ${action} | ${effectPath} | ${lineCount} |`);
    }
    lines.push("");
  }

  // File contents
  const writeEffects = dedupedEffects.filter(
    (e): e is Effect & { _tag: "WriteFile" | "AppendFile" } =>
      e._tag === "WriteFile" || e._tag === "AppendFile",
  );

  if (writeEffects.length > 0) {
    lines.push("## Files");
    lines.push("");
    for (const effect of writeEffects) {
      const lang = getLanguageHint(effect.path);
      lines.push(`### ${effect.path}`);
      lines.push("");
      lines.push(`\`\`\`${lang}`);
      lines.push(effect.content);
      lines.push("```");
      lines.push("");
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("Dry-run complete. No files were modified.");
  lines.push("");
  lines.push("To execute:");
  lines.push("");
  lines.push("```sh");
  lines.push(
    buildReplayCommand(generator.meta.name, answers, generator.prompts),
  );
  lines.push("```");
  lines.push("");

  return lines.join("\n");
};

/**
 * Build the JSON output structure for --format json.
 */
export const formatLlmJson = (
  generator: GeneratorDefinition,
  answers: Record<string, unknown>,
  effects: Effect[],
  verbose = false,
): Record<string, unknown> => {
  // The one plan rule: visible effects, each directory named once.
  const dedupedEffects = visiblePlanEffects(effects, verbose);

  const plan = dedupedEffects.map((effect) => {
    const entry: Record<string, unknown> = {
      action: getLlmActionLabel(effect),
      path: getLlmEffectPath(effect),
    };
    if (effect._tag === "WriteFile" || effect._tag === "AppendFile") {
      entry.lines = effect.content.split("\n").length;
    }
    return entry;
  });

  const files: Record<string, string> = {};
  for (const effect of dedupedEffects) {
    if (effect._tag === "WriteFile" || effect._tag === "AppendFile") {
      files[effect.path] = effect.content;
    }
  }

  return {
    generator: {
      name: generator.meta.name,
      version: generator.meta.version,
      description: generator.meta.description,
    },
    answers,
    plan,
    files,
    executeCommand: buildReplayCommand(
      generator.meta.name,
      answers,
      generator.prompts,
    ),
  };
};

/**
 * Format structured markdown help output for a generator (`--help --llm`).
 */
export const formatLlmHelp = (
  generator: GeneratorDefinition,
  commandPath: string,
): string => {
  const { meta, prompts } = generator;
  const lines: string[] = [];

  // Use commandPath directly — binary-agnostic
  lines.push(`# ${commandPath}`);
  lines.push("");
  lines.push(`> ${meta.description}`);
  lines.push(`> v${meta.version}`);
  lines.push("");

  if (meta.help) {
    lines.push(meta.help);
    lines.push("");
  }

  // Classify prompts as required vs optional
  const requiredPrompts = prompts.filter(
    (p) => p.default === undefined && !p.when,
  );
  const optionalPrompts = prompts.filter(
    (p) => p.default !== undefined || p.when,
  );

  const formatTypeHint = (prompt: PromptDefinition): string => {
    switch (prompt.type) {
      case "confirm":
        return "`[boolean]`";
      case "select": {
        const choices = prompt.choices ?? [];
        if (choices.length === 0) return "`<value>`";
        return `\`${choices.map((c) => c.value).join("\\|")}\``;
      }
      case "multiselect":
        return "`[value,value,...]`";
      default:
        return "`<value>`";
    }
  };

  if (requiredPrompts.length > 0) {
    lines.push("## Required Options");
    lines.push("");
    lines.push("| Flag | Type | Description |");
    lines.push("|------|------|-------------|");
    for (const p of requiredPrompts) {
      lines.push(
        `| --${formatFlagName(p.name)} | ${formatTypeHint(p)} | ${p.message} |`,
      );
    }
    lines.push("");
  }

  if (optionalPrompts.length > 0) {
    lines.push("## Optional Options");
    lines.push("");
    lines.push("| Flag | Type | Default | Description |");
    lines.push("|------|------|---------|-------------|");
    for (const p of optionalPrompts) {
      const def =
        p.default !== undefined ? `\`${JSON.stringify(p.default)}\`` : "";
      lines.push(
        `| --${formatFlagName(p.name)} | ${formatTypeHint(p)} | ${def} | ${p.message} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Global Options");
  lines.push("");
  lines.push("| Flag | Description |");
  lines.push("|------|-------------|");
  lines.push("| -d, --dry-run | Preview without writing files |");
  lines.push("| -y, --yes | Skip prompts, execute directly |");
  lines.push(
    "| -l, --llm | Preview in markdown format (no prompts, no stamps) |",
  );
  lines.push(
    "| --format json | Preview in JSON format (no prompts, no stamps) |",
  );
  lines.push("| --show-files | Show generated file contents in dry-run |");
  lines.push("| -v, --verbose | Show debug output |");
  lines.push("| --no-preview | Skip the file preview |");
  lines.push(
    "| --no-generated-stamp | Disable generated file stamp comments |",
  );
  lines.push("");

  // Workflow
  lines.push("## Workflow");
  lines.push("");

  const exampleFlags = requiredPrompts
    .map((p) => `--${formatFlagName(p.name)} <value>`)
    .join(" ");
  const flagStr = exampleFlags ? ` ${exampleFlags}` : "";

  lines.push(`1. Preview: \`${commandPath}${flagStr} --llm\``);
  lines.push(`2. Execute: \`${commandPath}${flagStr} --yes\``);
  lines.push("");

  // Examples
  if (meta.examples && meta.examples.length > 0) {
    lines.push("## Examples");
    lines.push("");
    for (const example of meta.examples) {
      lines.push("```sh");
      lines.push(example);
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
};
