/**
 * Print detailed help for a generator (meta.help and examples).
 *
 * When `llmMode` is true, outputs structured markdown help via formatLlmHelp.
 *
 * @note Impure — writes to stdout, loads generators via dynamic import.
 */

import { formatGeneratorLlmHelp } from "@canonical/cli-core";
import type { GeneratorNode } from "@canonical/summon-core";
import { toKebabCase } from "@canonical/utils";
import chalk from "chalk";
import { loadGenerator } from "../discovery/index.js";
import printNode from "./printNode.js";

export default async function printGeneratorHelp(
  node: GeneratorNode,
  pathSegments: string[],
  llmMode = false,
): Promise<void> {
  if (!node.indexPath) return;

  try {
    const generator = await loadGenerator(node.indexPath);
    const { meta, prompts } = generator;
    const commandPath = pathSegments.join(" ");

    // LLM mode: output structured markdown help and return
    if (llmMode) {
      process.stdout.write(formatGeneratorLlmHelp(generator, commandPath));
      return;
    }

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
        const flagName = `--${toKebabCase(prompt.name)}`;
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

    // LLM Usage section
    console.log();
    console.log(chalk.bold("LLM Usage:"));
    console.log(chalk.dim("  # Preview what will be generated (markdown):"));
    console.log(
      chalk.dim(
        `  summon ${commandPath} ${prompts
          .filter((p) => !p.when && p.default === undefined)
          .map((p) => `--${toKebabCase(p.name)} <value>`)
          .join(" ")} --llm`,
      ),
    );
    console.log(chalk.dim("  # Preview (JSON):"));
    console.log(
      chalk.dim(
        `  summon ${commandPath} ${prompts
          .filter((p) => !p.when && p.default === undefined)
          .map((p) => `--${toKebabCase(p.name)} <value>`)
          .join(" ")} --format json`,
      ),
    );
    console.log(chalk.dim("  # Execute directly:"));
    console.log(
      chalk.dim(
        `  summon ${commandPath} ${prompts
          .filter((p) => !p.when && p.default === undefined)
          .map((p) => `--${toKebabCase(p.name)} <value>`)
          .join(" ")} --yes`,
      ),
    );

    console.log();
  } catch {
    // Couldn't load generator, fall back to basic node printing
    printNode(node, pathSegments);
  }
}
