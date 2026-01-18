#!/usr/bin/env bun

/**
 * Summon CLI
 *
 * A monadic task-centric code generator framework.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { render } from "ink";
import { App } from "./components/App.js";
import type { GeneratorDefinition, PromptDefinition } from "./types.js";

// =============================================================================
// Generator Discovery (Tree Structure)
// =============================================================================

interface GeneratorNode {
  name: string;
  path: string; // Directory path
  indexPath?: string; // Path to index.ts if this is a runnable generator
  children: Map<string, GeneratorNode>;
  meta?: {
    name: string;
    description: string;
    version: string;
  };
}

/**
 * Merge a child node into a parent, combining children if the topic already exists.
 */
const mergeIntoTree = (parent: GeneratorNode, child: GeneratorNode): void => {
  const existing = parent.children.get(child.name);
  if (existing) {
    // Merge children - existing (local) takes precedence for indexPath
    for (const [name, grandchild] of child.children) {
      if (!existing.children.has(name)) {
        existing.children.set(name, grandchild);
      }
    }
    // Only set indexPath if existing doesn't have one (local takes precedence)
    if (!existing.indexPath && child.indexPath) {
      existing.indexPath = child.indexPath;
    }
  } else {
    parent.children.set(child.name, child);
  }
};

/**
 * Build a tree of generators from a directory.
 * Supports nested structure like:
 *   generators/component/react/index.ts  -> summon component react
 *   generators/component/svelte/index.ts -> summon component svelte
 *   generators/util/index.ts             -> summon util
 */
const buildGeneratorTree = async (
  dir: string,
  node: GeneratorNode,
): Promise<void> => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childDir = path.join(dir, entry.name);
        const indexPath = path.join(childDir, "index.ts");

        const childNode: GeneratorNode = {
          name: entry.name,
          path: childDir,
          children: new Map(),
        };

        // Check if this directory has an index.ts (is a runnable generator)
        try {
          await fs.access(indexPath);
          childNode.indexPath = indexPath;
        } catch {
          // No index.ts, might still have children
        }

        // Recursively discover children
        await buildGeneratorTree(childDir, childNode);

        // Only add node if it has an index.ts or has children with generators
        if (childNode.indexPath || childNode.children.size > 0) {
          mergeIntoTree(node, childNode);
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }
};

/**
 * Extract topic name from a summon package name.
 * summon-component -> component
 * @scope/summon-component -> component
 */
const _extractTopicFromPackageName = (pkgName: string): string | null => {
  // Handle scoped packages: @scope/summon-topic
  const scopedMatch = pkgName.match(/^@[^/]+\/summon-(.+)$/);
  if (scopedMatch) return scopedMatch[1];

  // Handle unscoped packages: summon-topic
  const unscopedMatch = pkgName.match(/^summon-(.+)$/);
  if (unscopedMatch) return unscopedMatch[1];

  return null;
};

/**
 * Check if a path is a directory (follows symlinks).
 */
const isDirectory = async (filePath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(filePath); // stat follows symlinks
    return stat.isDirectory();
  } catch {
    return false;
  }
};

/**
 * Discover summon-* packages in node_modules.
 */
const discoverNodeModulesPackages = async (
  nodeModulesDir: string,
  root: GeneratorNode,
): Promise<void> => {
  try {
    const entries = await fs.readdir(nodeModulesDir);

    for (const entry of entries) {
      const entryPath = path.join(nodeModulesDir, entry);

      if (entry.startsWith("@")) {
        // Scoped packages - look inside @scope/
        if (!(await isDirectory(entryPath))) continue;
        try {
          const scopedEntries = await fs.readdir(entryPath);
          for (const scopedEntry of scopedEntries) {
            if (scopedEntry.startsWith("summon-")) {
              const pkgDir = path.join(entryPath, scopedEntry);
              if (await isDirectory(pkgDir)) {
                await processPackage(`${entry}/${scopedEntry}`, pkgDir, root);
              }
            }
          }
        } catch {
          // Scope directory doesn't exist or can't be read
        }
      } else if (entry.startsWith("summon-")) {
        // Unscoped summon-* package
        if (await isDirectory(entryPath)) {
          await processPackage(entry, entryPath, root);
        }
      }
    }
  } catch {
    // node_modules doesn't exist
  }
};

/**
 * Process a potential summon package.
 */
/**
 * Generator cache - stores generators loaded from package barrels.
 * Key is the command path (e.g., "component/react").
 */
const generatorCache = new Map<string, GeneratorDefinition>();

/**
 * Insert a generator into the tree at the given path.
 * Creates intermediate namespace nodes as needed.
 */
const insertGeneratorAtPath = (
  root: GeneratorNode,
  pathStr: string,
  generator: GeneratorDefinition,
): void => {
  const segments = pathStr.split("/").filter(Boolean);
  let current = root;

  // Cache the generator for later lookup
  generatorCache.set(pathStr, generator);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (!current.children.has(segment)) {
      current.children.set(segment, {
        name: segment,
        path: "",
        children: new Map(),
      });
    }

    const child = current.children.get(segment);
    if (!child) continue; // Should never happen since we just set it

    if (isLast) {
      // Mark as having a generator (use path as synthetic indexPath)
      child.indexPath = `cache:${pathStr}`;
    }

    current = child;
  }
};

/**
 * Process a summon-* package.
 *
 * Imports the package's main entry and looks for a `generators` export
 * mapping command paths to generator definitions.
 */
const processPackage = async (
  pkgName: string,
  pkgDir: string,
  root: GeneratorNode,
): Promise<void> => {
  // Read package.json to get the main entry
  const pkgJsonPath = path.join(pkgDir, "package.json");
  let mainEntry: string | undefined;

  try {
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));
    mainEntry = pkgJson.main;
  } catch {
    return; // Can't read package.json
  }

  if (!mainEntry) return;

  // Import the package's main entry
  const entryPath = path.join(pkgDir, mainEntry);
  try {
    const module = await import(entryPath);
    const generators =
      module.generators ?? module.default ?? ({} as Record<string, unknown>);

    // Insert each generator into the tree
    for (const [cmdPath, generator] of Object.entries(generators)) {
      if (generator && typeof generator === "object" && "meta" in generator) {
        insertGeneratorAtPath(root, cmdPath, generator as GeneratorDefinition);
      }
    }
  } catch (err) {
    console.error(
      chalk.yellow(`Warning: Could not load generators from '${pkgName}':`),
      (err as Error).message,
    );
  }
};

/**
 * Create the root generator tree from all sources.
 *
 * When `explicitPath` is provided, ONLY load from that path (for testing).
 *
 * Otherwise, priority (highest to lowest):
 * 1. Local ./generators/ (project-specific)
 * 2. Local ./.generators/ (project-specific, hidden)
 * 3. node_modules summon-* packages
 * 4. Built-in generators from @canonical/summon
 */
const discoverGeneratorTree = async (
  explicitPath?: string,
): Promise<GeneratorNode> => {
  const root: GeneratorNode = {
    name: "root",
    path: "",
    children: new Map(),
  };

  if (explicitPath) {
    // Explicit path mode: ONLY load from the specified directory
    const absolutePath = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(process.cwd(), explicitPath);
    await buildGeneratorTree(absolutePath, root);
    return root;
  }

  // Normal discovery mode
  // 1. Built-in generators (lowest priority - added first, can be overridden)
  await buildGeneratorTree(path.join(__dirname, "..", "generators"), root);

  // 2. node_modules packages (medium priority)
  await discoverNodeModulesPackages(
    path.join(process.cwd(), "node_modules"),
    root,
  );

  // 3. Local .generators (high priority)
  await buildGeneratorTree(path.join(process.cwd(), ".generators"), root);

  // 4. Local generators (highest priority - added last, overrides all)
  await buildGeneratorTree(path.join(process.cwd(), "generators"), root);

  return root;
};

/**
 * Navigate the generator tree by path segments.
 * Returns [node, remainingSegments] where node is as deep as we could go.
 */
const _navigateTree = (
  root: GeneratorNode,
  segments: string[],
): [GeneratorNode, string[]] => {
  let current = root;
  let i = 0;

  for (; i < segments.length; i++) {
    const child = current.children.get(segments[i]);
    if (!child) break;
    current = child;
  }

  return [current, segments.slice(i)];
};

/**
 * Load a generator from a path or cache.
 */
const loadGenerator = async (
  generatorPath: string,
): Promise<GeneratorDefinition> => {
  // Check if this is a cached generator from a package barrel
  if (generatorPath.startsWith("cache:")) {
    const cacheKey = generatorPath.slice(6);
    const cached = generatorCache.get(cacheKey);
    if (cached) return cached;
    throw new Error(`Generator not found in cache: ${cacheKey}`);
  }

  const module = await import(generatorPath);
  const generator = module.default ?? module.generator;

  if (!generator) {
    throw new Error(
      `No default export or 'generator' export found in ${generatorPath}`,
    );
  }

  return generator as GeneratorDefinition;
};

// =============================================================================
// CLI Commands
// =============================================================================

const program = new Command();

// =============================================================================
// Display helpers
// =============================================================================

/**
 * Print the available generators/sub-generators at a node.
 */
const printNode = (node: GeneratorNode, pathSegments: string[]) => {
  const prefix = pathSegments.length > 0 ? `${pathSegments.join(" ")} ` : "";
  const isRoot = pathSegments.length === 0;

  if (node.children.size === 0) {
    console.log(chalk.yellow("No generators found"));
    console.log(chalk.dim("\nCreate generators in:"));
    console.log(chalk.dim("  - ./generators/<topic>/index.ts"));
    console.log(chalk.dim("  - ./generators/<topic>/<subtopic>/index.ts"));
    return;
  }

  if (isRoot) {
    console.log(chalk.bold("\nAvailable topics:\n"));
  } else {
    console.log(chalk.bold(`\nAvailable under '${pathSegments.join(" ")}':\n`));
  }

  for (const [name, child] of node.children) {
    const hasChildren = child.children.size > 0;
    const isRunnable = !!child.indexPath;

    let suffix = "";
    if (hasChildren && isRunnable) {
      suffix = chalk.dim(" (runnable, has subtopics)");
    } else if (hasChildren) {
      suffix = chalk.dim(" (has subtopics)");
    }

    console.log(chalk.cyan(`  ${name}`) + suffix);

    // Show immediate children as hints
    if (hasChildren) {
      const childNames = [...child.children.keys()].slice(0, 5);
      const more =
        child.children.size > 5 ? `, +${child.children.size - 5} more` : "";
      console.log(chalk.dim(`    └─ ${childNames.join(", ")}${more}`));
    }
  }

  console.log(chalk.dim(`\nUsage: summon ${prefix}<topic>`));
  console.log();
};

/**
 * Print detailed help for a generator (meta.help and examples).
 */
const _printGeneratorHelp = async (
  node: GeneratorNode,
  pathSegments: string[],
) => {
  if (!node.indexPath) return;

  try {
    const generator = await loadGenerator(node.indexPath);
    const { meta, prompts } = generator;
    const commandPath = pathSegments.join(" ");

    console.log();
    console.log(chalk.bold.cyan(`summon ${commandPath}`));
    console.log(chalk.dim(`v${meta.version}`));
    console.log();
    console.log(meta.description);

    // Print extended help if available
    if (meta.help) {
      console.log();
      console.log(meta.help);
    }

    // Print available options (from prompts)
    if (prompts.length > 0) {
      console.log();
      console.log(chalk.bold("Options:"));
      console.log();
      for (const prompt of prompts) {
        const flagName = `--${prompt.name}`;
        const typeHint =
          prompt.type === "confirm"
            ? "[boolean]"
            : prompt.type === "select"
              ? `[${prompt.choices?.map((c) => c.value).join("|")}]`
              : prompt.type === "multiselect"
                ? "[value,value,...]"
                : "<value>";

        const defaultHint =
          prompt.default !== undefined
            ? chalk.dim(` (default: ${JSON.stringify(prompt.default)})`)
            : "";

        console.log(`  ${chalk.cyan(flagName)} ${typeHint}${defaultHint}`);
        console.log(`      ${prompt.message}`);
      }
    }

    // Print examples if available
    if (meta.examples && meta.examples.length > 0) {
      console.log();
      console.log(chalk.bold("Examples:"));
      console.log();
      for (const example of meta.examples) {
        console.log(`  ${chalk.dim("$")} ${example}`);
      }
    }

    // Print available subtopics if any
    if (node.children.size > 0) {
      console.log();
      console.log(chalk.bold("Subtopics:"));
      for (const [name, child] of node.children) {
        const desc = child.meta?.description ?? "";
        console.log(`  ${chalk.cyan(name)}${desc ? ` - ${desc}` : ""}`);
      }
    }

    console.log();
  } catch {
    // Couldn't load generator, fall back to basic node printing
    printNode(node, pathSegments);
  }
};

// =============================================================================
// Run generator helper
// =============================================================================

/**
 * Check if all required prompts have answers.
 */
const hasAllRequiredAnswers = (
  prompts: GeneratorDefinition["prompts"],
  answers: Record<string, unknown>,
): boolean => {
  for (const prompt of prompts) {
    // Skip prompts with `when` conditions - they may be optional
    if (prompt.when) continue;

    // Check if we have an answer (including falsy values like false, 0, "")
    if (!(prompt.name in answers) && prompt.default === undefined) {
      return false;
    }
  }
  return true;
};

/**
 * Apply defaults for prompts that don't have answers.
 */
const applyDefaults = (
  prompts: GeneratorDefinition["prompts"],
  answers: Record<string, unknown>,
): Record<string, unknown> => {
  const result = { ...answers };
  for (const prompt of prompts) {
    if (!(prompt.name in result) && prompt.default !== undefined) {
      result[prompt.name] = prompt.default;
    }
  }
  return result;
};

// =============================================================================
// CLI Setup
// =============================================================================

/**
 * Build option info for a prompt (flags, description, default).
 */
interface OptionInfo {
  flags: string;
  description: string;
  defaultValue?: string;
  group?: string;
  /** The original camelCase prompt name */
  promptName: string;
  /** The kebab-case flag name (without --) */
  kebabName: string;
}

/**
 * Convert camelCase to kebab-case.
 * withTests -> with-tests
 * installDeps -> install-deps
 */
const toKebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * Convert kebab-case to camelCase.
 * with-tests -> withTests
 * install-deps -> installDeps
 */
const _toCamelCase = (str: string): string =>
  str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

const buildOptionInfo = (prompt: PromptDefinition): OptionInfo => {
  const kebabName = toKebabCase(prompt.name);
  const flagName = `--${kebabName}`;

  // NOTE: We intentionally do NOT pass defaultValue to Commander.
  // Defaults are handled by applyDefaults() after prompting, so we can
  // distinguish between "user didn't provide" vs "user provided default value".

  switch (prompt.type) {
    case "confirm": {
      const defaultVal = prompt.default === true;
      if (defaultVal) {
        return {
          flags: `--no-${kebabName}`,
          description: `${prompt.message}`,
          group: prompt.group,
          promptName: prompt.name,
          kebabName,
        };
      }
      return {
        flags: flagName,
        description: `${prompt.message}`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    case "select": {
      const choices = prompt.choices?.map((c) => c.value).join("|") ?? "";
      return {
        flags: `${flagName} <value>`,
        description: `${prompt.message} [${choices}]`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    case "multiselect": {
      return {
        flags: `${flagName} <values>`,
        description: `${prompt.message} (comma-separated)`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    default: {
      return {
        flags: `${flagName} <value>`,
        description: `${prompt.message}`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
  }
};

/**
 * Add prompt-based options to a Commander command.
 */
const addPromptOptions = (cmd: Command, prompts: PromptDefinition[]): void => {
  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    cmd.option(info.flags, info.description, info.defaultValue);
  }
};

/**
 * Configure custom help with grouped options for a command.
 */
const configureGroupedHelp = (
  cmd: Command,
  prompts: PromptDefinition[],
): void => {
  // Collect option info by group
  const groups = new Map<string, OptionInfo[]>();
  const defaultGroupName = "Generator Options";

  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    const groupName = info.group ?? defaultGroupName;
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)?.push(info);
  }

  // Only configure custom help if there are grouped options
  if (groups.size <= 1 && !prompts.some((p) => p.group)) {
    return;
  }

  // Override help output using configureHelp
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = 28; // Fixed width for option flags column

      const formatItem = (
        term: string,
        description: string,
        defaultVal?: string,
      ): string => {
        const fullDesc = defaultVal
          ? `${description} (default: ${JSON.stringify(defaultVal)})`
          : description;

        if (description) {
          const padding = " ".repeat(Math.max(termWidth - term.length, 2));
          return `  ${term}${padding}${fullDesc}`;
        }
        return `  ${term}`;
      };

      let output = "";

      // Usage
      output += `Usage: ${helper.commandUsage(cmd)}\n`;

      // Description
      const desc = helper.commandDescription(cmd);
      if (desc) {
        output += `\n${desc}\n`;
      }

      // Built-in options (Global Options group)
      output += "\nGlobal Options:\n";
      output += formatItem("-d, --dry-run", "Preview without writing files");
      output += "\n";
      output += formatItem("-y, --yes", "Skip confirmation prompts");
      output += "\n";
      output += formatItem("--no-preview", "Skip the file preview");
      output += "\n";
      output += formatItem("-h, --help", "display help for command");
      output += "\n";

      // Grouped prompt options
      for (const [groupName, options] of groups) {
        output += `\n${groupName}:\n`;
        for (const opt of options) {
          output += formatItem(opt.flags, opt.description, opt.defaultValue);
          output += "\n";
        }
      }

      return output;
    },
  });
};

/**
 * Extract answers from Commander options based on prompts.
 * Commander converts kebab-case flags to camelCase option keys automatically,
 * so --with-tests becomes options.withTests.
 *
 * IMPORTANT: For confirm (boolean) prompts with default: true, Commander's
 * --no-X flag pattern means the option is ALWAYS present (true by default,
 * false when --no-X is used). We skip these unless the value differs from
 * the prompt's default, indicating the user explicitly used the flag.
 */
const extractAnswers = (
  options: Record<string, unknown>,
  prompts: PromptDefinition[],
): Record<string, unknown> => {
  const answers: Record<string, unknown> = {};

  for (const prompt of prompts) {
    // Commander auto-converts kebab-case to camelCase, so we can use the prompt name directly
    const value = options[prompt.name];

    if (value !== undefined) {
      switch (prompt.type) {
        case "confirm": {
          const boolValue = Boolean(value);
          // For confirm prompts, Commander always sets a value due to --no-X pattern.
          // Only include if the value differs from the prompt's default,
          // which indicates the user explicitly used the flag.
          if (boolValue !== prompt.default) {
            answers[prompt.name] = boolValue;
          }
          break;
        }
        case "multiselect":
          answers[prompt.name] =
            typeof value === "string"
              ? value.split(",").map((v) => v.trim())
              : value;
          break;
        default:
          answers[prompt.name] = value;
      }
    }
  }

  return answers;
};

/**
 * Command Barrel - A flattened representation of all commands to register.
 * This separates command discovery from registration, making the process cleaner.
 */
interface CommandEntry {
  /** Path segments to this command (e.g., ["component", "react"]) */
  path: string[];
  /** The generator definition if this is a runnable command */
  generator?: GeneratorDefinition;
  /** Description for namespace-only commands */
  description?: string;
}

/**
 * Build a command barrel from a generator tree.
 * This flattens the tree into a list of commands, sorted by depth so parents are created first.
 */
const buildCommandBarrel = async (
  node: GeneratorNode,
  pathSegments: string[] = [],
): Promise<CommandEntry[]> => {
  const entries: CommandEntry[] = [];

  for (const [name, child] of node.children) {
    const childPath = [...pathSegments, name];

    if (child.indexPath) {
      // Runnable generator
      try {
        const generator = await loadGenerator(child.indexPath);
        entries.push({ path: childPath, generator });

        // If it also has children, we need to ensure parent exists and recurse
        if (child.children.size > 0) {
          const childEntries = await buildCommandBarrel(child, childPath);
          entries.push(...childEntries);
        }
      } catch (err) {
        console.error(
          chalk.yellow(`Warning: Could not load generator '${name}':`),
          (err as Error).message,
        );
      }
    } else if (child.children.size > 0) {
      // Namespace-only (no indexPath but has children)
      // Add a placeholder entry so we create the parent command
      entries.push({
        path: childPath,
        description: `${name} generators`,
      });

      // Recurse into children
      const childEntries = await buildCommandBarrel(child, childPath);
      entries.push(...childEntries);
    }
  }

  // Sort by path length so parents are registered before children
  return entries.sort((a, b) => a.path.length - b.path.length);
};

/**
 * Register all commands from a command barrel.
 * Commands are registered in order (parents before children) using a map to track created commands.
 */
const registerFromBarrel = (rootCmd: Command, barrel: CommandEntry[]): void => {
  const commandMap = new Map<string, Command>();
  commandMap.set("", rootCmd);

  for (const entry of barrel) {
    const name = entry.path[entry.path.length - 1];
    const parentPath = entry.path.slice(0, -1).join("/");
    const currentPath = entry.path.join("/");

    // Skip if already registered (can happen with namespace + runnable at same path)
    const existingCmd = commandMap.get(currentPath);
    if (existingCmd) {
      // But if we now have a generator, update the command
      if (entry.generator) {
        configureGeneratorCommand(existingCmd, entry.generator);
      }
      continue;
    }

    // Get or create parent command
    const parentCmd = commandMap.get(parentPath) ?? rootCmd;

    if (entry.generator) {
      // Create runnable generator command
      const cmd = parentCmd
        .command(name)
        .description(entry.generator.meta.description)
        .option("-d, --dry-run", "Preview without writing files")
        .option("-y, --yes", "Skip confirmation prompts")
        .option("--no-preview", "Skip the file preview");

      configureGeneratorCommand(cmd, entry.generator);
      commandMap.set(currentPath, cmd);
    } else {
      // Create namespace-only command (just a container for subcommands)
      const cmd = parentCmd
        .command(name)
        .description(entry.description ?? `${name} commands`);

      commandMap.set(currentPath, cmd);
    }
  }
};

/**
 * Configure a command with generator options and action.
 */
const configureGeneratorCommand = (
  cmd: Command,
  generator: GeneratorDefinition,
): void => {
  // Add prompt-based options
  addPromptOptions(cmd, generator.prompts);

  // Configure grouped help display
  configureGroupedHelp(cmd, generator.prompts);

  // Add action
  cmd.action(async (cmdOptions: Record<string, unknown>) => {
    // Extract only explicitly provided CLI answers (not defaults)
    const cliAnswers = extractAnswers(cmdOptions, generator.prompts);
    // Apply defaults for checking if we have all required answers
    const answersWithDefaults = applyDefaults(generator.prompts, cliAnswers);

    // Determine execution mode
    const hasAllAnswers = hasAllRequiredAnswers(
      generator.prompts,
      answersWithDefaults,
    );
    const isTTY = process.stdin.isTTY === true;
    const skipPrompts = cmdOptions.yes === true;

    if (hasAllAnswers && cmdOptions.dryRun && !isTTY) {
      // Batch dry-run mode (non-interactive)
      const { dryRun } = await import("./dry-run.js");
      const { isVisibleEffect, formatEffectLine } = await import(
        "./cli-format.js"
      );

      console.log();
      console.log(chalk.bold.magenta(generator.meta.name));
      console.log(chalk.dim(generator.meta.description));
      console.log();

      const task = generator.generate(answersWithDefaults);
      const result = dryRun(task);

      // Filter and deduplicate effects
      const seenDirPaths = new Set<string>();
      const visibleEffects = result.effects.filter((e) => {
        if (!isVisibleEffect(e)) return false;
        if (e._tag === "MakeDir") {
          if (seenDirPaths.has(e.path)) return false;
          seenDirPaths.add(e.path);
        }
        return true;
      });

      console.log(chalk.dim.bold("Plan:"));
      visibleEffects.forEach((effect, index) => {
        const isLast = index === visibleEffects.length - 1;
        console.log(formatEffectLine(effect, isLast));
      });

      console.log();
      console.log(chalk.dim("Dry-run complete. No files were modified."));
    } else {
      // Interactive mode
      // Only pass answers if:
      // 1. User explicitly used --yes to skip prompts, OR
      // 2. User provided CLI arguments (not just defaults)
      const shouldSkipPrompts =
        skipPrompts || Object.keys(cliAnswers).length > 0;
      const passedAnswers = shouldSkipPrompts ? answersWithDefaults : undefined;

      const { waitUntilExit } = render(
        <App
          generator={generator}
          preview={cmdOptions.preview as boolean}
          dryRunOnly={cmdOptions.dryRun as boolean}
          answers={passedAnswers}
        />,
      );

      await waitUntilExit();
    }
  });
};

/**
 * Register all generator commands from the tree.
 * Uses the barrel pattern: build flat list → sort by depth → register in order.
 */
const registerGeneratorCommands = async (
  parentCmd: Command,
  node: GeneratorNode,
  _pathSegments: string[],
): Promise<void> => {
  const barrel = await buildCommandBarrel(node);
  registerFromBarrel(parentCmd, barrel);
};

// Main CLI setup
const main = async () => {
  program
    .name("summon")
    .description("A monadic task-centric code generator framework")
    .version("0.1.0")
    .option(
      "-g, --generators <path>",
      "Load generators ONLY from this path (for testing)",
    );

  // Get generators path from args early (before full parse)
  const generatorsIdx = process.argv.indexOf("--generators");
  const gIdx = process.argv.indexOf("-g");
  const generatorsPath =
    generatorsIdx !== -1
      ? process.argv[generatorsIdx + 1]
      : gIdx !== -1
        ? process.argv[gIdx + 1]
        : undefined;

  // Discover generators
  const root = await discoverGeneratorTree(generatorsPath);

  // If no arguments or just help, show available topics
  if (process.argv.length === 2 || process.argv.includes("--help")) {
    if (process.argv.length === 2) {
      printNode(root, []);
      return;
    }
  }

  // Register generator commands dynamically
  await registerGeneratorCommands(program, root, []);

  // Init command
  program
    .command("init")
    .description(
      "Create a new generator (supports nested paths like 'component/react')",
    )
    .argument(
      "<path>",
      "Path to the generator (e.g., 'my-gen' or 'component/react')",
    )
    .option(
      "-d, --dir <path>",
      "Directory to create generator in",
      "./generators",
    )
    .action(async (genPath: string, initOptions) => {
      // Support both 'component/react' and 'component react' syntax
      const normalizedPath = genPath.replace(/\s+/g, "/");
      const segments = normalizedPath.split("/").filter(Boolean);
      const name = segments[segments.length - 1];
      const generatorDir = path.join(initOptions.dir, ...segments);

      try {
        await fs.mkdir(generatorDir, { recursive: true });
        await fs.mkdir(path.join(generatorDir, "templates"), {
          recursive: true,
        });

        // Create index.ts
        const indexContent = `/**
 * ${name} Generator
 *
 * Generated by summon init
 */

import type { GeneratorDefinition } from "@canonical/summon";
import { writeFile, mkdir, info } from "@canonical/summon";
import { sequence_, when } from "@canonical/summon";
import { template, withHelpers } from "@canonical/summon";
import * as path from "node:path";

interface Answers {
	name: string;
	description: string;
	withTests: boolean;
}

export const generator: GeneratorDefinition<Answers> = {
	meta: {
		name: "${name}",
		description: "A ${name} generator",
		version: "0.1.0",
	},

	prompts: [
		{
			name: "name",
			type: "text",
			message: "What is the name?",
		},
		{
			name: "description",
			type: "text",
			message: "Description:",
			default: "",
		},
		{
			name: "withTests",
			type: "confirm",
			message: "Include tests?",
			default: true,
		},
	],

	generate: (answers) => {
		const vars = withHelpers({
			...answers,
		});

		return sequence_([
			info(\`Generating \${answers.name}...\`),
			mkdir(answers.name),
			template({
				source: path.join(__dirname, "templates", "index.ts.ejs"),
				dest: path.join(answers.name, "index.ts"),
				vars,
			}),
			when(
				answers.withTests,
				template({
					source: path.join(__dirname, "templates", "index.test.ts.ejs"),
					dest: path.join(answers.name, "index.test.ts"),
					vars,
				}),
			),
			info("Done!"),
		]);
	},
};

export default generator;
`;

        await fs.writeFile(path.join(generatorDir, "index.ts"), indexContent);

        // Create template files
        const indexTemplate = `// <%= name %>
// <%= description %>

export const <%= camelCase(name) %> = () => {
	// TODO: Implement
};
`;

        const testTemplate = `import { describe, expect, it } from "bun:test";
import { <%= camelCase(name) %> } from "./index";

describe("<%= name %>", () => {
	it("should work", () => {
		expect(<%= camelCase(name) %>).toBeDefined();
	});
});
`;

        await fs.writeFile(
          path.join(generatorDir, "templates", "index.ts.ejs"),
          indexTemplate,
        );
        await fs.writeFile(
          path.join(generatorDir, "templates", "index.test.ts.ejs"),
          testTemplate,
        );

        console.log(chalk.green(`✓ Created generator '${name}'`));
        console.log(chalk.dim(`  ${generatorDir}`));
        console.log();
        console.log(chalk.dim("Run with:"));
        console.log(chalk.cyan(`  summon ${segments.join(" ")}`));
      } catch (err) {
        console.error(chalk.red("Error:"), (err as Error).message);
        process.exit(1);
      }
    });

  // Parse and execute
  program.parse();
};

// Run main
main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
