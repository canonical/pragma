/**
 * The curated root `--help` page.
 *
 * The kernel curates the nouns it ships — and only those. It names no domain:
 * the nouns it does NOT curate lead the page untitled (the header one line up
 * already carries the distribution's blurb) and describe themselves through
 * their own verbs, so the front door follows the content instead of naming it.
 * Every section is reconciled against the *live* nouns (from the registered
 * verbs), so a noun that is not built yet is dropped and one the kernel has
 * never heard of still surfaces.
 */

import { DETAIL_LEVELS } from "../../../constants.js";
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
  /**
   * Absent for the leading uncurated group: its rows sit directly under the
   * usage line, since repeating the header's blurb as a heading three lines
   * below it says the same thing twice.
   */
  readonly title?: string;
  readonly nouns: readonly NounSummary[];
}

/**
 * The kernel's own nouns, grouped by task with curated summaries. Order is
 * intentional: what people reach for most comes first; agent tooling comes last.
 *
 * @param programName - The CLI binary name (the distribution's `name`).
 * @returns The task-oriented groups, in display order.
 */
function buildKernelGroups(programName: string): readonly HelpGroup[] {
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
        // The one noun with no verb to speak for it, so its summary is a
        // literal rather than derived. That was ALREADY the working mechanism
        // when a `hidden: true` `mcp` spec still existed under
        // `capabilities/meta/`: `buildProgram` filters hidden verbs before
        // registering, `emitSurface` and `emitReference` filter them too, and
        // `bin.ts` answers `mcp` at argv[0] before any of them run. The spec
        // reached nothing, and this literal — with its twin in
        // `completion/model.ts` — is what actually put `mcp` in help and in
        // completions. The spec has since been deleted; this line is unchanged
        // because it was never the fallback, it was the mechanism.
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

/**
 * Summarise an uncurated noun from its first live verb — which is the pack's own
 * `description` whenever the pack ships a `list` (`compilePack` compiles that
 * verb first). The terminal period a pack sentence carries is dropped so the
 * column reads as one voice with the kernel's own fragments.
 */
function summarizeNoun(noun: string, verbs: readonly VerbSpec[]): string {
  const first = verbs.find((v) => v.path[0] === noun && !v.hidden);
  return (first?.summary ?? `${noun} commands`).replace(/\.$/, "");
}

/**
 * Build the curated root help string.
 *
 * @param programName - The CLI binary name (the distribution's `name`).
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
  const kernel = buildKernelGroups(programName);
  const curated = new Set(kernel.flatMap((g) => g.nouns.map((n) => n.noun)));

  const groups: HelpGroup[] = [
    // Everything the kernel's curated table does not claim — in the shipped
    // binary the bundled domain packs, in a fork whatever it ships. Untitled
    // and first, so the domain leads the page without the kernel naming it.
    {
      nouns: [...present]
        .filter((n) => !curated.has(n))
        .sort()
        .map((noun) => ({ noun, summary: summarizeNoun(noun, verbs) })),
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
    if (group.title) lines.push(helpHeading(group.title));
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
      `Progressive-disclosure level (${DETAIL_LEVELS.join(", ")})`,
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
