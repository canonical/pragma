/**
 * The grouped-help INSTALLER — the Commander half of the split: reads the
 * command's usage and description through Commander's help formatter and
 * hands them to the data seam's pure {@link renderGroupedHelp}.
 *
 * Module-internal to the adapter (exported for its tests, never on the
 * subpath index): both hosts reach it only through
 * `registerGeneratorCommands`.
 */

import type { Command } from "commander";
import { buildOptionGroups, renderGroupedHelp } from "../groupedHelp.js";
import type { HostFlags, PromptLike } from "../types.js";

/**
 * Configure custom help with grouped options for a command. Under the default
 * presentation, a command whose prompts declare no groups (and collapse to at
 * most one) keeps Commander's default help; a host renderer installs
 * UNCONDITIONALLY — the host chose one help style for every leaf, and leaving
 * its ungrouped generators on Commander's default would reintroduce exactly
 * the inconsistency it supplied the renderer to remove.
 *
 * @param cmd - The command to configure.
 * @param prompts - The command's prompts (live or projected).
 * @param hostFlags - The host's standard-flag rows for the global block.
 * @param renderHelp - The host's own presentation, when it supplies one
 *   (see `CommanderHost.renderHelp`); omitted means `renderGroupedHelp`.
 * @note Impure — installs a `configureHelp` override on the command.
 */
export default function configureGroupedHelp(
  cmd: Command,
  prompts: readonly PromptLike[],
  hostFlags: HostFlags,
  renderHelp?: typeof renderGroupedHelp,
): void {
  const groups = buildOptionGroups(prompts);

  // The default presentation only takes over when there are grouped options
  if (
    renderHelp === undefined &&
    groups.size <= 1 &&
    !prompts.some((p) => p.group)
  ) {
    return;
  }

  const render = renderHelp ?? renderGroupedHelp;
  cmd.configureHelp({
    formatHelp: (helpCmd, helper) =>
      render(
        helper.commandUsage(helpCmd),
        helper.commandDescription(helpCmd),
        groups,
        hostFlags,
      ),
  });
}
