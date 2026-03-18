/**
 * Print available generators/sub-generators at a tree node.
 *
 * @note Impure — writes to stdout.
 */

import chalk from "chalk";
import type { GeneratorNode, GeneratorOrigin } from "../discovery/types.js";

/**
 * Format origin badge for display.
 */
const formatOrigin = (origin?: GeneratorOrigin): string => {
  switch (origin) {
    case "local":
      return chalk.green("[local]");
    case "global":
      return chalk.blue("[global]");
    case "package":
      return chalk.magenta("[pkg]");
    case "builtin":
      return chalk.dim("[builtin]");
    default:
      return "";
  }
};

export default function printNode(
  node: GeneratorNode,
  pathSegments: string[],
): void {
  const prefix = pathSegments.length > 0 ? `${pathSegments.join(" ")} ` : "";
  const isRoot = pathSegments.length === 0;

  if (node.children.size === 0) {
    console.log(chalk.yellow("No generators found"));
    console.log(chalk.dim("\nInstall a generator package:"));
    console.log(chalk.dim("  bun add @scope/summon-<name>"));
    console.log(chalk.dim("\nOr link globally (from the package directory):"));
    console.log(chalk.dim("  bun link        # for bun users"));
    console.log(chalk.dim("  npm link        # for npm users"));
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
    const originBadge = child.origin ? ` ${formatOrigin(child.origin)}` : "";

    let suffix = "";
    if (hasChildren && isRunnable) {
      suffix = chalk.dim(" (runnable, has subtopics)");
    } else if (hasChildren) {
      suffix = chalk.dim(" (has subtopics)");
    }

    console.log(chalk.cyan(`  ${name}`) + originBadge + suffix);

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
}
