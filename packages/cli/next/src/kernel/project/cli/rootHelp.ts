/**
 * Curated root `--help` for `pragma`.
 *
 * The front door is hand-curated, not auto-generated: nouns are grouped into
 * task-oriented sections with real one-line summaries, and each section is
 * reconciled against the *live* nouns (from the registered verbs) so a noun
 * that is not built yet is dropped and an uncatalogued one still surfaces under
 * "Other" rather than vanishing. Ported from the v1 root help, retargeted at
 * the grammar and the v2 noun set (no `llm`/`graphql`/`trace`/`tokens`).
 */

import type { VerbSpec } from "../../spec/types.js";
import {
  helpColumns,
  helpDim,
  helpHeading,
  helpTerm,
  helpUsage,
} from "./helpFormat.js";

interface NounSummary {
  readonly noun: string;
  readonly summary: string;
}

interface HelpGroup {
  readonly title: string;
  readonly nouns: readonly NounSummary[];
}

/**
 * Task-oriented grouping with curated summaries. Order is intentional: what
 * people reach for most (exploring, generating) comes first; agent tooling
 * comes last.
 */
const HELP_GROUPS: readonly HelpGroup[] = [
  {
    title: "Explore the design system",
    nouns: [
      {
        noun: "block",
        summary: "Inspect components & patterns and their anatomy",
      },
      { noun: "token", summary: "Look up design tokens and their values" },
      { noun: "modifier", summary: "Inspect modifiers and modifier families" },
      { noun: "standard", summary: "Browse code standards and categories" },
      {
        noun: "ontology",
        summary: "Explore the loaded ontologies (classes, properties)",
      },
      { noun: "tier", summary: "List the design-system tiers" },
    ],
  },
  {
    title: "Generate code",
    nouns: [
      { noun: "create", summary: "Scaffold components, packages, and apps" },
    ],
  },
  {
    title: "Query & serve the graph",
    nouns: [
      {
        noun: "graph",
        summary: "Run SPARQL queries or inspect a URI directly",
      },
    ],
  },
  {
    title: "Set up & maintain",
    nouns: [
      { noun: "doctor", summary: "Check environment health" },
      {
        noun: "setup",
        summary: "Configure MCP, skills, completions, and the LSP",
      },
      {
        noun: "sources",
        summary: "Build and refresh the local store from packages",
      },
      { noun: "config", summary: "Read and write pragma configuration" },
      { noun: "info", summary: "Show version, config, and update status" },
      {
        noun: "upgrade",
        summary: "Upgrade the pragma CLI to the latest version",
      },
    ],
  },
  {
    title: "For AI agents",
    nouns: [
      {
        noun: "capabilities",
        summary: "Discover conventions, tools, and the discovery sequence",
      },
      {
        noun: "colophon",
        summary: "Read how pragma and the active domain are made",
      },
      {
        noun: "skill",
        summary: "Browse agent skills from design-system packages",
      },
      { noun: "prompt", summary: "Browse reusable prompt templates" },
      { noun: "mcp", summary: "Start the MCP server over stdio" },
    ],
  },
];

/** All distinct, non-hidden top-level nouns present in the registered verbs. */
function nounsFrom(verbs: readonly VerbSpec[]): Set<string> {
  const nouns = new Set<string>();
  for (const verb of verbs) {
    if (verb.hidden) continue;
    nouns.add(verb.path[0]);
  }
  return nouns;
}

/** The summary to show for an uncatalogued but live noun. */
function fallbackSummary(noun: string, verbs: readonly VerbSpec[]): string {
  const first = verbs.find((v) => v.path[0] === noun && !v.hidden);
  return first?.summary ?? `${noun} commands`;
}

/**
 * Build the curated root help string.
 *
 * @param programName - The CLI binary name (`pragma`).
 * @param description - The program description shown in the header.
 * @param verbs - All registered verbs, used to derive the live noun set.
 * @returns The formatted, colorized help text.
 */
export function formatRootHelp(
  programName: string,
  description: string,
  verbs: readonly VerbSpec[],
): string {
  const present = nounsFrom(verbs);
  // `mcp` is served by the bin's special-case, not a projected verb, but is
  // always available — surface it so the front door is complete.
  present.add("mcp");
  const catalogued = new Set(
    HELP_GROUPS.flatMap((g) => g.nouns.map((n) => n.noun)),
  );

  const uncatalogued = [...present].filter((n) => !catalogued.has(n)).sort();
  const groups: HelpGroup[] = [
    ...HELP_GROUPS.map((g) => ({
      ...g,
      nouns: g.nouns.filter((n) => present.has(n.noun)),
    })),
    ...(uncatalogued.length > 0
      ? [
          {
            title: "Other",
            nouns: uncatalogued.map((noun) => ({
              noun,
              summary: fallbackSummary(noun, verbs),
            })),
          },
        ]
      : []),
  ].filter((g) => g.nouns.length > 0);

  // One column width across ALL groups so the noun column aligns section to
  // section, not just within a section.
  const nounWidth = Math.max(
    ...groups.flatMap((g) => g.nouns.map((n) => n.noun.length)),
    0,
  );

  const lines: string[] = [
    `${helpHeading(programName)} — ${description}`,
    "",
    helpUsage(
      `${programName} ${helpTerm("<command>")} ${helpDim("[subcommand] [flags]")}`,
    ),
    "",
  ];

  for (const group of groups) {
    lines.push(helpHeading(group.title));
    lines.push(
      ...helpColumns(
        group.nouns.map((n) => [n.noun, n.summary] as const),
        nounWidth,
      ),
    );
    lines.push("");
  }

  // The frozen global-flags block: these doc strings MUST stay byte-consistent
  // with FIXED_SURFACE.globalFlags (emitSurface.ts) — restyle the LAYOUT only,
  // never these strings.
  lines.push(helpHeading("Global flags"));
  const flags: [string, string][] = [
    [
      "--format <plain|llm|json>",
      "Select output format (llm = condensed Markdown for agents)",
    ],
    [
      "--detail <level>",
      "Progressive-disclosure level (summary, standard, detailed)",
    ],
    ["--verbose", "Diagnostic output on stderr"],
    ["--help", "Show help (works on any command)"],
    ["--version", "Show the CLI version"],
  ];
  lines.push(...helpColumns(flags));
  lines.push("");

  lines.push(
    helpDim(
      `Run \`${programName} <command> --help\` for details, or \`${programName} capabilities\` to get oriented.`,
    ),
  );

  return lines.join("\n");
}
