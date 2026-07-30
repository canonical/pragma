/**
 * The curated root `--help` page.
 *
 * The kernel curates the nouns it ships — and only those. It names no domain:
 * a pack-contributed noun leads the page under the distribution's own help
 * blurb and describes itself through its first live verb, so the front door
 * follows the content instead of duplicating it. Every section is reconciled
 * against the *live* nouns (from the registered verbs), so a noun that is not
 * built yet is dropped and one the kernel has never heard of still surfaces.
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
 * The kernel's own nouns, grouped by task with curated summaries. Order is
 * intentional: what people reach for most comes first; agent tooling comes last.
 *
 * @param programName - The CLI binary name (the distribution's `name`).
 * @returns The task-oriented groups, in display order.
 */
function kernelGroups(programName: string): readonly HelpGroup[] {
  return [
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
        {
          noun: "ontology",
          summary: "Explore the loaded ontologies (classes, properties)",
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
          summary: "Build and refresh the local store from packs",
        },
        {
          noun: "config",
          summary: `Read and write ${programName} configuration`,
        },
        { noun: "info", summary: "Show version, config, and update status" },
        {
          noun: "upgrade",
          summary: `Upgrade the ${programName} CLI to the latest version`,
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
          summary: `Read how ${programName} and the active domain are made`,
        },
        { noun: "skill", summary: "Browse agent skills from the active packs" },
        { noun: "prompt", summary: "Browse reusable prompt templates" },
        // The one noun with no verb to speak for it (the bin special-cases it),
        // so its summary is hand-written rather than derived.
        { noun: "mcp", summary: "Start the MCP server over stdio" },
      ],
    },
  ];
}

/** All distinct, non-hidden top-level nouns present in the registered verbs. */
function nounsFrom(verbs: readonly VerbSpec[]): Set<string> {
  const nouns = new Set<string>();
  for (const verb of verbs) {
    if (verb.hidden) continue;
    nouns.add(verb.path[0]);
  }
  return nouns;
}

/** The summary for a pack-contributed noun: its first live verb's. */
function packSummary(noun: string, verbs: readonly VerbSpec[]): string {
  const first = verbs.find((v) => v.path[0] === noun && !v.hidden);
  return first?.summary ?? `${noun} commands`;
}

/**
 * Build the curated root help string.
 *
 * @param programName - The CLI binary name (the distribution's `name`).
 * @param description - The program description shown in the header, and the
 *   title of the leading section holding the pack-contributed nouns.
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
  const kernel = kernelGroups(programName);
  const curated = new Set(kernel.flatMap((g) => g.nouns.map((n) => n.noun)));

  const groups: HelpGroup[] = [
    // Not in the kernel's table ⇒ it came from a pack. Those nouns lead the
    // page, under the distribution's own blurb, described by their own verbs.
    {
      title: description,
      nouns: [...present]
        .filter((n) => !curated.has(n))
        .sort()
        .map((noun) => ({ noun, summary: packSummary(noun, verbs) })),
    },
    ...kernel.map((g) => ({
      ...g,
      nouns: g.nouns.filter((n) => present.has(n.noun)),
    })),
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
