/**
 * Grouped `--help` for a generator command — extracted verbatim from the
 * summon bin's registration layer, with ONE change: the host's standard-flag
 * block (previously a hard-coded summon list) is injected as {@link HostFlags},
 * so each binary shows its own globals above the same generated prompt groups.
 *
 * The override is installed only when the prompts declare groups (or resolve
 * to more than one group); an ungrouped command keeps Commander's default
 * help, exactly as before.
 */

import type { Command, Help } from "commander";
import buildOptionInfo from "./buildOptionInfo.js";
import type { HostFlags, OptionInfo, PromptLike } from "./types.js";

/** Fixed width for the option-flags column. */
const TERM_WIDTH = 28;

/** The default group for prompts that declare none. */
const DEFAULT_GROUP_NAME = "Generator Options";

/** Collect a command's prompt options by group, in declared order. */
export function buildOptionGroups(
  prompts: readonly PromptLike[],
): Map<string, OptionInfo[]> {
  const groups = new Map<string, OptionInfo[]>();
  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    const groupName = info.group ?? DEFAULT_GROUP_NAME;
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)?.push(info);
  }
  return groups;
}

/** One `--help` row: flags column padded to the fixed width, then the text. */
function formatItem(
  term: string,
  description: string,
  defaultVal?: string,
): string {
  const fullDesc = defaultVal
    ? `${description} (default: ${JSON.stringify(defaultVal)})`
    : description;

  if (description) {
    const padding = " ".repeat(Math.max(TERM_WIDTH - term.length, 2));
    return `  ${term}${padding}${fullDesc}`;
  }
  return `  ${term}`;
}

/**
 * Build the grouped help text for a command: usage, description, the host's
 * standard-flag block, then each prompt group.
 *
 * @param cmd - The command being described.
 * @param helper - Commander's help formatter (usage/description sources).
 * @param groups - The prompt options by group (see {@link buildOptionGroups}).
 * @param hostFlags - The host's standard-flag rows for the global block.
 * @returns The complete help text.
 */
export function formatGroupedHelp(
  cmd: Command,
  helper: Help,
  groups: ReadonlyMap<string, readonly OptionInfo[]>,
  hostFlags: HostFlags,
): string {
  let output = "";

  // Usage
  output += `Usage: ${helper.commandUsage(cmd)}\n`;

  // Description
  const desc = helper.commandDescription(cmd);
  if (desc) {
    output += `\n${desc}\n`;
  }

  // The host's standard flags (Global Options group)
  output += "\nGlobal Options:\n";
  for (const flag of hostFlags) {
    output += formatItem(flag.flags, flag.description);
    output += "\n";
  }

  // Grouped prompt options
  for (const [groupName, options] of groups) {
    output += `\n${groupName}:\n`;
    for (const opt of options) {
      output += formatItem(opt.flags, opt.description, opt.defaultValue);
      output += "\n";
    }
  }

  return output;
}

/**
 * Configure custom help with grouped options for a command. A command whose
 * prompts declare no groups (and collapse to at most one) keeps Commander's
 * default help.
 *
 * @param cmd - The command to configure.
 * @param prompts - The command's prompts (live or projected).
 * @param hostFlags - The host's standard-flag rows for the global block.
 * @note Impure — installs a `configureHelp` override on the command.
 */
export function configureGroupedHelp(
  cmd: Command,
  prompts: readonly PromptLike[],
  hostFlags: HostFlags,
): void {
  const groups = buildOptionGroups(prompts);

  // Only configure custom help if there are grouped options
  if (groups.size <= 1 && !prompts.some((p) => p.group)) {
    return;
  }

  cmd.configureHelp({
    formatHelp: (helpCmd, helper) =>
      formatGroupedHelp(helpCmd, helper, groups, hostFlags),
  });
}
