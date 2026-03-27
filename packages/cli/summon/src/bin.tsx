#!/usr/bin/env bun

/**
 * Summon CLI — thin orchestrator.
 *
 * Wires together generator discovery, display, registration, and completion.
 * All domain logic lives in the corresponding modules.
 *
 * @note Impure — CLI entry point.
 */

import * as path from "node:path";
import {
  discoverGeneratorTree,
  type GeneratorNode,
} from "@canonical/summon-core";
import chalk from "chalk";
import { Command } from "commander";
import {
  type CompletionNode,
  handleSetupRequest,
  initCompletion,
  isCompletionRequest,
  isSetupRequest,
} from "./completion.js";
import { loadGenerator } from "./discovery/index.js";
import { printGeneratorHelp, printNode } from "./display/index.js";
import {
  buildCommandBarrel,
  registerFromBarrel,
} from "./registration/index.js";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Navigate the generator tree by path segments.
 * Returns [node, remainingSegments] where node is as deep as we could go.
 */
const navigateTree = (
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
 * Convert GeneratorNode to CompletionNode for the completion module.
 */
const toCompletionNode = (node: GeneratorNode): CompletionNode => ({
  name: node.name,
  indexPath: node.indexPath,
  children: new Map(
    [...node.children.entries()].map(([name, child]) => [
      name,
      toCompletionNode(child),
    ]),
  ),
});

/**
 * Register all generator commands from the tree.
 * Uses the barrel pattern: build flat list → sort by depth → register in order.
 */
const registerGeneratorCommands = async (
  parentCmd: Command,
  node: GeneratorNode,
): Promise<void> => {
  const barrel = await buildCommandBarrel(node);
  registerFromBarrel(parentCmd, barrel);
};

// =============================================================================
// Main
// =============================================================================

const program = new Command();

const main = async () => {
  // Get generators path from args early (before full parse)
  const generatorsIdx = process.argv.indexOf("--generators");
  const gIdx = process.argv.indexOf("-g");
  const generatorsPath =
    generatorsIdx !== -1
      ? process.argv[generatorsIdx + 1]
      : gIdx !== -1
        ? process.argv[gIdx + 1]
        : undefined;

  // Discover generators (needed for both completion and normal CLI)
  const builtinDir = path.join(__dirname, "..", "generators");
  const root = await discoverGeneratorTree(
    generatorsPath ? { explicitPath: generatorsPath } : { builtinDir },
  );

  // Initialize shell completion (must happen before commander parsing)
  if (isCompletionRequest() || isSetupRequest()) {
    const completionTree = toCompletionNode(root);
    const complete = await initCompletion(completionTree, loadGenerator);

    // Handle setup/cleanup requests
    if (isSetupRequest()) {
      handleSetupRequest(complete);
      return;
    }

    // For completion requests, omelette handles everything via init()
    return;
  }

  program
    .name("summon")
    .description("A monadic task-centric code generator framework")
    .version("0.1.0")
    .option(
      "-g, --generators <path>",
      "Load generators ONLY from this path (for testing)",
    )
    .option("--setup-completion", "Install shell autocompletion")
    .option("--cleanup-completion", "Remove shell autocompletion");

  // If no arguments, show available topics
  if (process.argv.length === 2) {
    printNode(root, []);
    console.log(
      chalk.dim(
        "Tip: Run 'summon --setup-completion' to enable TAB completion\n",
      ),
    );
    return;
  }

  // Intercept --help --llm (or --help -l) for structured markdown help
  const hasHelp =
    process.argv.includes("--help") || process.argv.includes("-h");
  const hasLlm =
    process.argv.includes("--llm") ||
    process.argv.includes("-l") ||
    process.env.SUMMON_LLM === "1";
  if (hasHelp && hasLlm) {
    // Extract command path segments (skip flags and flag arguments)
    const skipFlags = new Set([
      "--help",
      "-h",
      "--llm",
      "-l",
      "--generators",
      "-g",
      "--format",
    ]);
    const args = process.argv.slice(2);
    const segments: string[] = [];
    let skipNext = false;
    for (const arg of args) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (skipFlags.has(arg)) {
        if (arg === "--generators" || arg === "-g" || arg === "--format")
          skipNext = true;
        continue;
      }
      if (arg.startsWith("-")) continue;
      segments.push(arg);
    }

    if (segments.length > 0) {
      const [node] = navigateTree(root, segments);
      if (node.indexPath) {
        await printGeneratorHelp(node, segments, true);
        return;
      }
    }
    // Fall through to normal help if we can't find the generator
  }

  // Register generator commands dynamically
  await registerGeneratorCommands(program, root);

  // Parse and execute
  program.parse();
};

// Run main
main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
