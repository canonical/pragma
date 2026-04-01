import chalk from "chalk";

/**
 * Apply lightweight syntax coloring to a code string.
 *
 * Performs keyword-level colorization for YAML and Turtle (TTL) content.
 * This is not full syntax highlighting — just enough to make structure
 * scannable in the terminal.
 *
 * - YAML keys: bold
 * - YAML list markers (`-`): dim
 * - TTL prefixes (`@prefix`): cyan
 * - TTL predicates (prefixed names like `ds:name`): blue
 * - TTL type declarations (`a ds:Component`): magenta
 *
 * @param code - The raw code string.
 * @param language - Language identifier ("yaml", "ttl", or "text").
 * @returns The string with ANSI color codes applied.
 */
export default function syntaxColor(code: string, language: string): string {
  switch (language) {
    case "yaml":
      return colorizeYaml(code);
    case "ttl":
      return colorizeTurtle(code);
    default:
      return code;
  }
}

function colorizeYaml(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      const listMatch = line.match(/^(\s*)(- )(.*)/);
      if (listMatch) {
        return `${listMatch[1]}${chalk.dim(listMatch[2])}${listMatch[3]}`;
      }
      const kvMatch = line.match(/^(\s*)([^:]+):(.*)/);
      if (kvMatch) {
        return `${kvMatch[1]}${chalk.bold(kvMatch[2])}:${kvMatch[3]}`;
      }
      return line;
    })
    .join("\n");
}

function colorizeTurtle(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("@prefix")) {
        return chalk.cyan(line);
      }
      const typeMatch = line.match(/(\s+a\s+)(\S+)/);
      if (typeMatch) {
        return line.replace(
          typeMatch[0],
          `${typeMatch[1]}${chalk.magenta(typeMatch[2])}`,
        );
      }
      return line.replace(/\b([a-z]+:[a-zA-Z.]+)/g, (match) =>
        chalk.blue(match),
      );
    })
    .join("\n");
}
