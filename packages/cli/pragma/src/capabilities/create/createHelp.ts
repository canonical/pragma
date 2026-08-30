/**
 * Pragma's presentation of a `create` leaf's grouped help — the host half of
 * the summon-core help seam (`CommanderHost.renderHelp`): the projection
 * decides the STRUCTURE (usage, description, the option groups, the host's
 * flag rows), this module effects pragma's house style over it, composed from
 * the same kernel primitives every other help page uses
 * (`kernel/project/cli/helpFormat.ts`) — a dim `Usage:` label, bold headings,
 * cyan-term/dim-description columns. Colour therefore rides the kernel's one
 * gate (chalk's TTY detection plus the style seam's `NO_COLOR` zeroing), so
 * piped output — the cross-CLI structural-parity surface — stays plain bytes.
 */

import type { renderGroupedHelp } from "@canonical/summon-core/projection";
import {
  helpColumns,
  helpHeading,
  helpUsage,
} from "../../kernel/project/cli/helpFormat.js";

/** One heading + its `[term, description]` rows. */
type HelpSection = readonly [
  heading: string,
  rows: readonly (readonly [term: string, description: string])[],
];

/**
 * A row's description with the shared renderer's default-value suffix — the
 * same bytes `renderGroupedHelp` appends, so the structural-parity cells
 * compare the fact, not two spellings of it.
 */
function describeOption(description: string, defaultValue?: string): string {
  return defaultValue
    ? `${description} (default: ${JSON.stringify(defaultValue)})`
    : description;
}

/** Render a `create` leaf's grouped help in pragma's house style. */
export const renderCreateHelp: typeof renderGroupedHelp = (
  usage,
  description,
  groups,
  hostFlags,
) => {
  const sections: HelpSection[] = [
    ["Global Options", hostFlags.map((flag) => [flag.flags, flag.description])],
    ...[...groups].map(
      ([groupName, options]): HelpSection => [
        groupName,
        options.map((opt) => [
          opt.flags,
          describeOption(opt.description, opt.defaultValue),
        ]),
      ],
    ),
  ];

  // One column width across ALL sections so the flag column aligns section to
  // section (the root help does the same for its noun column).
  const width = Math.max(
    ...sections.flatMap(([, rows]) => rows.map(([term]) => term.length)),
    0,
  );

  const lines: string[] = [helpUsage(usage)];
  if (description) lines.push("", description);
  for (const [heading, rows] of sections) {
    lines.push("", helpHeading(heading), ...helpColumns(rows, width));
  }
  // Commander prints `formatHelp`'s return verbatim — terminate the page.
  return `${lines.join("\n")}\n`;
};
