/**
 * Effect formatting utilities for CLI output.
 *
 * Lifted from summon-core's cli-format.ts into cli-framework so both
 * summon and pragma binaries can share effect formatting without importing
 * summon internals.
 */

import * as path from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import type { Effect } from "@canonical/task";
import chalk from "chalk";

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
    default:
      return false;
  }
};

/**
 * Get human-readable action label for an effect.
 */
export const getActionLabel = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
      return "Create file";
    case "AppendFile":
      return "Append to";
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
    default:
      return effect._tag;
  }
};

/**
 * Get color for action label based on effect type.
 */
export const getActionColor = (
  effect: Effect,
): "green" | "red" | "yellow" | "cyan" | "blue" | "magenta" | undefined => {
  switch (effect._tag) {
    case "WriteFile":
    case "MakeDir":
      return "green";
    case "AppendFile":
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
    default:
      return undefined;
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
    default:
      return effect._tag;
  }
};

/**
 * Format a single effect as a CLI line (for non-interactive output).
 */
export const formatEffectLine = (effect: Effect, isLast: boolean): string => {
  const connector = isLast ? "└─" : "├─";
  const actionLabel = getActionLabel(effect);
  const color = getActionColor(effect);
  const payload = getEffectPayload(effect);

  const colorFn = color ? chalk[color] : (s: string) => s;
  const paddedLabel = actionLabel.padEnd(ACTION_LABEL_WIDTH);

  return `${chalk.dim(connector)} ${colorFn(paddedLabel)}${payload}`;
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
    return `${chalk.dim(`${lineNum} │`)} ${truncatedLine}`;
  });

  if (totalLines > maxLines) {
    formatted.push(
      chalk.dim(`   ... (${totalLines - maxLines} more lines omitted)`),
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
): string => {
  const baseLine = formatEffectLine(effect, isLast);

  // Only show content for WriteFile and AppendFile effects
  if (effect._tag === "WriteFile" || effect._tag === "AppendFile") {
    const indent = isLast ? "   " : "│  ";
    const contentPreview = formatContentPreview(effect.content);
    const indentedContent = contentPreview
      .split("\n")
      .map((line) => `${chalk.dim(indent)}${line}`)
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
    default:
      return effect._tag.toLowerCase();
  }
};

/**
 * Get the path/description for an effect (plain text, for LLM output).
 */
export const getLlmEffectPath = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
    case "AppendFile":
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
    default:
      return "";
  }
};

/**
 * Build the replay command string from generator name and answers.
 */
export const buildReplayCommand = (
  generatorName: string,
  answers: Record<string, unknown>,
  prompts: PromptDefinition[],
): string => {
  const parts = ["summon", generatorName];

  for (const prompt of prompts) {
    const value = answers[prompt.name];
    if (value === undefined) continue;

    const kebabName = prompt.name
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();

    if (prompt.type === "confirm") {
      if (value === true && prompt.default !== true) {
        parts.push(`--${kebabName}`);
      } else if (value === false && prompt.default === true) {
        parts.push(`--no-${kebabName}`);
      }
    } else if (prompt.type === "multiselect" && Array.isArray(value)) {
      if (value.length > 0) {
        parts.push(`--${kebabName}`, value.join(","));
      }
    } else {
      parts.push(`--${kebabName}`, String(value));
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

  // Filter visible effects
  const visibleEffects = effects.filter((e) => isVisibleEffect(e, verbose));

  // Deduplicate MakeDir
  const seenDirPaths = new Set<string>();
  const dedupedEffects = visibleEffects.filter((e) => {
    if (e._tag === "MakeDir") {
      if (seenDirPaths.has(e.path)) return false;
      seenDirPaths.add(e.path);
    }
    return true;
  });

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
  const visibleEffects = effects.filter((e) => isVisibleEffect(e, verbose));

  // Deduplicate MakeDir
  const seenDirPaths = new Set<string>();
  const dedupedEffects = visibleEffects.filter((e) => {
    if (e._tag === "MakeDir") {
      if (seenDirPaths.has(e.path)) return false;
      seenDirPaths.add(e.path);
    }
    return true;
  });

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
 * Format structured markdown help output for --help --llm.
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
      case "select":
        return `\`${prompt.choices?.map((c) => c.value).join("\\|") ?? ""}\``;
      case "multiselect":
        return "`[value,value,...]`";
      default:
        return "`<value>`";
    }
  };

  const toKebab = (s: string): string =>
    s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

  if (requiredPrompts.length > 0) {
    lines.push("## Required Options");
    lines.push("");
    lines.push("| Flag | Type | Description |");
    lines.push("|------|------|-------------|");
    for (const p of requiredPrompts) {
      lines.push(
        `| --${toKebab(p.name)} | ${formatTypeHint(p)} | ${p.message} |`,
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
        `| --${toKebab(p.name)} | ${formatTypeHint(p)} | ${def} | ${p.message} |`,
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
    .map((p) => `--${toKebab(p.name)} <value>`)
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
