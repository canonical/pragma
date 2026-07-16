/**
 * Curated root `--help` for `pragma`.
 *
 * cli-core's generic `formatHelp` derives a description per top-level noun from
 * its commands, but noun groups that only have verbs (e.g. `block list`) have
 * no command to carry one — so it emits placeholder text like "block commands".
 * The root help is also the CLI's front door, so its content and grouping are
 * worth hand-curating here rather than auto-generating.
 *
 * This renderer:
 * - groups nouns into task-oriented sections with real one-line summaries,
 * - derives each section's live nouns from the registered commands (so a noun
 *   that disappears is dropped, and a new, uncatalogued one still shows up
 *   under "Other" instead of vanishing),
 * - expands `create` to show its scaffolding subtypes, including the component
 *   frameworks pulled straight from the command's parameter choices.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import chalk from "chalk";

interface NounSummary {
  readonly noun: string;
  readonly summary: string;
}

interface HelpGroup {
  readonly title: string;
  readonly nouns: readonly NounSummary[];
}

/**
 * Task-oriented grouping with curated summaries. Order is intentional: the
 * things people reach for most (exploring the system, generating code) come
 * first; agent/integration tooling comes last.
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
      {
        noun: "graphql",
        summary: "Compile and serve a GraphQL API over the ontologies",
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
      { noun: "config", summary: "Read and write pragma.config.json" },
      { noun: "tokens", summary: "Generate a Terrazzo tokens config" },
      {
        noun: "info",
        summary: "Show version, config, update status, and store summary",
      },
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
        noun: "llm",
        summary: "LLM orientation: context, decision trees, command reference",
      },
      { noun: "mcp", summary: "Start the MCP server over stdio" },
      {
        noun: "prompt",
        summary: "List and hydrate prompts (mirrors MCP prompts/get)",
      },
      {
        noun: "skill",
        summary: "Browse agent skills from design-system packages",
      },
    ],
  },
];

/** All distinct top-level nouns present in the registered commands. */
function nounsFrom(commands: readonly CommandDefinition[]): Set<string> {
  const nouns = new Set<string>();
  for (const cmd of commands) {
    const noun = cmd.path[0];
    if (noun) nouns.add(noun);
  }
  return nouns;
}

/** The verbs (second path segment) registered under a noun, in order. */
function verbsOf(
  noun: string,
  commands: readonly CommandDefinition[],
): CommandDefinition[] {
  return commands.filter((c) => c.path[0] === noun && c.path.length > 1);
}

/**
 * The framework values offered by `create component`, e.g. `react · svelte ·
 * lit`, read from the command's `framework` parameter choices so the help
 * can never drift from what the generator actually accepts.
 */
function componentFrameworks(
  commands: readonly CommandDefinition[],
): string | undefined {
  const component = commands.find(
    (c) => c.path[0] === "create" && c.path[1] === "component",
  );
  const choices = component?.parameters.find(
    (p) => p.name === "framework",
  )?.choices;
  if (!choices || choices.length === 0) return undefined;
  return choices.map((c) => c.label).join(" · ");
}

/** Render the `create` subtypes as indented sub-lines. */
function createSubtypes(
  commands: readonly CommandDefinition[],
  subWidth: number,
): string[] {
  const lines: string[] = [];
  const frameworks = componentFrameworks(commands);
  for (const verb of verbsOf("create", commands)) {
    const name = verb.path[1] as string;
    const note =
      name === "component" && frameworks
        ? frameworks
        : name === "package"
          ? "a new package for the monorepo"
          : verb.description;
    lines.push(
      `      ${chalk.dim("·")} ${chalk.cyan(name.padEnd(subWidth))}  ${chalk.dim(note)}`,
    );
  }
  return lines;
}

/**
 * Build the curated root help string.
 *
 * @param programName - The CLI binary name (`pragma`).
 * @param description - The program description shown in the header.
 * @param commands - All registered command definitions.
 * @returns The formatted, colorized help text.
 */
export default function formatRootHelp(
  programName: string,
  description: string,
  commands: readonly CommandDefinition[],
): string {
  const present = nounsFrom(commands);
  // `mcp` is attached to Commander directly (not via the command list), but is
  // always available — surface it so the front door is complete.
  present.add("mcp");
  const catalogued = new Set(
    HELP_GROUPS.flatMap((g) => g.nouns.map((n) => n.noun)),
  );

  // Any live noun we didn't curate is surfaced so nothing silently disappears.
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
              summary:
                verbsOf(noun, commands)[0]?.description ?? `${noun} commands`,
            })),
          },
        ]
      : []),
  ].filter((g) => g.nouns.length > 0);

  // One shared column width so summaries line up across every group.
  const nounWidth = Math.max(
    ...groups.flatMap((g) => g.nouns.map((n) => n.noun.length)),
    0,
  );
  const subWidth = Math.max(
    ...verbsOf("create", commands).map((v) => (v.path[1] as string).length),
    0,
  );

  const lines: string[] = [
    `${chalk.bold(programName)} — ${description}`,
    "",
    `${chalk.dim("Usage:")} ${programName} ${chalk.cyan("<command>")} ${chalk.dim("[subcommand] [flags]")}`,
    "",
  ];

  for (const group of groups) {
    lines.push(chalk.bold(group.title));
    for (const { noun, summary } of group.nouns) {
      lines.push(
        `  ${chalk.cyan(noun.padEnd(nounWidth))}  ${chalk.dim(summary)}`,
      );
      if (noun === "create") {
        lines.push(...createSubtypes(commands, subWidth));
      }
    }
    lines.push("");
  }

  lines.push(chalk.bold("Global flags"));
  const flags: [string, string][] = [
    ["--llm", "Condensed Markdown output for agents"],
    ["--format json", "Machine-readable JSON output"],
    ["--verbose", "Diagnostic output on stderr"],
    ["--help", "Show help (works on any command)"],
    ["--version", "Show the CLI version"],
  ];
  const flagWidth = Math.max(...flags.map(([f]) => f.length));
  for (const [flag, desc] of flags) {
    lines.push(`  ${chalk.cyan(flag.padEnd(flagWidth))}  ${chalk.dim(desc)}`);
  }
  lines.push("");

  lines.push(
    chalk.dim(
      `Run \`${programName} <command> --help\` for details, or \`${programName} capabilities\` to get oriented.`,
    ),
  );

  return lines.join("\n");
}
