/**
 * Grouped `--help` for a generator command — the PURE half of the split: the
 * group bucketing and the rendered page, with the host's standard-flag block
 * injected as {@link HostFlags} so each binary shows its own globals above
 * the same generated prompt groups. The Commander installer (and its
 * install-only-when-grouped guard) lives in the adapter seam
 * (`projection/commander/configureGroupedHelp.ts`); this module never
 * touches Commander, not even as types.
 */

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
 * Render the grouped help text for a command: usage, description, the host's
 * standard-flag block, then each prompt group.
 *
 * @param usage - The command's usage string (the adapter supplies
 *   Commander's).
 * @param description - The command's description; `""` skips the block.
 * @param groups - The prompt options by group (see {@link buildOptionGroups}).
 * @param hostFlags - The host's standard-flag rows for the global block.
 * @returns The complete help text.
 */
export function renderGroupedHelp(
  usage: string,
  description: string,
  groups: ReadonlyMap<string, readonly OptionInfo[]>,
  hostFlags: HostFlags,
): string {
  let output = "";

  // Usage
  output += `Usage: ${usage}\n`;

  // Description
  if (description) {
    output += `\n${description}\n`;
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
