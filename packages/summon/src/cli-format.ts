/**
 * CLI Formatting Utilities
 *
 * Shared formatting functions for CLI output (both interactive and batch modes).
 */

import chalk from "chalk";
import type { Effect } from "./types.js";

// Fixed width for action label column
const ACTION_LABEL_WIDTH = 14;

/**
 * Filter effects to only show user-relevant ones (not internal effects).
 */
export const isVisibleEffect = (effect: Effect): boolean => {
  switch (effect._tag) {
    case "WriteFile":
    case "AppendFile":
    case "MakeDir":
    case "CopyFile":
    case "CopyDirectory":
    case "DeleteFile":
    case "DeleteDirectory":
    case "Exec":
      return true;
    case "Log":
      // Filter out debug logs
      return effect.level !== "debug";
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
    case "Log":
      switch (effect.level) {
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
    case "Log":
      return effect.level === "error"
        ? "red"
        : effect.level === "warn"
          ? "yellow"
          : "blue";
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
