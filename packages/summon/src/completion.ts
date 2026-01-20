/**
 * Shell Autocompletion Support for Summon CLI
 *
 * Uses omelette to provide TAB completion for:
 * - Generator names (navigating the command tree)
 * - Generator arguments (based on prompt definitions)
 * - File/folder paths for path-related prompts
 *
 * Supports Bash, Zsh, and Fish shells.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import omelette from "omelette";
import type { GeneratorDefinition, PromptDefinition } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/** Represents a node in the generator tree (simplified for completion) */
export interface CompletionNode {
  name: string;
  indexPath?: string;
  children: Map<string, CompletionNode>;
}

/** Flattened generator info for completion */
interface GeneratorInfo {
  path: string[];
  prompts: PromptDefinition[];
}

// =============================================================================
// Path Detection
// =============================================================================

/**
 * Detect if a prompt expects a file/folder path based on its name or message.
 */
export const isPathPrompt = (prompt: PromptDefinition): boolean => {
  const pathIndicators = [
    "path",
    "dir",
    "directory",
    "file",
    "folder",
    "location",
  ];
  const nameLower = prompt.name.toLowerCase();
  const messageLower = prompt.message.toLowerCase();

  return pathIndicators.some(
    (ind) => nameLower.includes(ind) || messageLower.includes(ind),
  );
};

// =============================================================================
// Filesystem Completion
// =============================================================================

/**
 * Get filesystem path completions for a partial path.
 */
export const getPathCompletions = (partial: string): string[] => {
  try {
    // Handle empty or relative paths
    const searchPath = partial || ".";
    const dir = path.dirname(searchPath);
    const prefix = path.basename(searchPath);

    // Try to read the directory
    const dirToRead = partial.endsWith("/") ? searchPath : dir;
    const entries = fs.readdirSync(dirToRead, { withFileTypes: true });

    // Filter entries that match the prefix
    const matches = entries
      .filter((entry) => {
        // If partial ends with /, show all entries
        if (partial.endsWith("/")) return true;
        // Otherwise filter by prefix
        return entry.name.startsWith(prefix);
      })
      .map((entry) => {
        const name = entry.name;
        const basePath = partial.endsWith("/") ? searchPath : dir;
        const fullPath = basePath === "." ? name : path.join(basePath, name);

        // Append / for directories to enable continued completion
        return entry.isDirectory() ? `${fullPath}/` : fullPath;
      })
      .slice(0, 50); // Limit results

    return matches;
  } catch {
    // Directory doesn't exist or can't be read
    return [];
  }
};

// =============================================================================
// Argument Completion
// =============================================================================

/**
 * Convert camelCase to kebab-case for CLI flags.
 */
const toKebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * Get completions for generator arguments based on prompt definitions.
 *
 * @param prompts - The prompt definitions for the generator
 * @param line - The current command line
 * @param before - The word before the cursor
 * @param showAll - If true, show all flags even if line doesn't contain --
 */
export const getArgumentCompletions = (
  prompts: PromptDefinition[],
  line: string,
  before: string,
  showAll = false,
): string[] => {
  const completions: string[] = [];

  // Check if we're completing a flag value (e.g., --type=<TAB> or --type <TAB>)
  const flagValueMatch = line.match(/--([a-z-]+)(?:=|\s+)([^\s]*)$/i);
  if (flagValueMatch) {
    const flagName = flagValueMatch[1];
    const partial = flagValueMatch[2] || "";

    // Find the corresponding prompt
    const prompt = prompts.find(
      (p) => toKebabCase(p.name) === flagName || p.name === flagName,
    );

    if (prompt) {
      // For select/multiselect, return choices
      if (
        (prompt.type === "select" || prompt.type === "multiselect") &&
        prompt.choices
      ) {
        return prompt.choices
          .map((c) => c.value)
          .filter((v) => v.startsWith(partial));
      }

      // For text prompts that look like paths, return path completions
      if (prompt.type === "text" && isPathPrompt(prompt)) {
        return getPathCompletions(partial);
      }
    }
  }

  // Check if we're completing a flag name (--<TAB>) or showing all flags
  const flagNameMatch = line.match(/--([a-z-]*)$/i);
  const shouldShowFlags =
    showAll ||
    flagNameMatch ||
    before === "--" ||
    before.startsWith("--") ||
    before.startsWith("-");

  if (shouldShowFlags) {
    // Extract partial from the flag name match, or from 'before' if it starts with --
    let partial = flagNameMatch?.[1] || "";
    if (!partial && before.startsWith("--")) {
      partial = before.slice(2);
    } else if (!partial && before.startsWith("-")) {
      partial = before.slice(1);
    }

    for (const prompt of prompts) {
      const kebabName = toKebabCase(prompt.name);

      if (prompt.type === "confirm") {
        // For confirm prompts, show --no-X if default is true, --X if default is false
        if (prompt.default === true) {
          const flag = `no-${kebabName}`;
          if (flag.startsWith(partial)) {
            completions.push(`--${flag}`);
          }
        } else {
          if (kebabName.startsWith(partial)) {
            completions.push(`--${kebabName}`);
          }
        }
      } else {
        if (kebabName.startsWith(partial)) {
          completions.push(`--${kebabName}`);
        }
      }
    }

    // Add built-in flags
    const builtinFlags = [
      "--dry-run",
      "--yes",
      "--verbose",
      "--no-preview",
      "--no-generated-stamp",
      "--help",
    ];
    for (const flag of builtinFlags) {
      if (flag.startsWith(`--${partial}`)) {
        completions.push(flag);
      }
    }
  }

  return completions;
};

// =============================================================================
// Tree Building
// =============================================================================

/**
 * Generator loader function type - passed in to avoid circular dependencies.
 */
export type GeneratorLoader = (
  indexPath: string,
) => Promise<GeneratorDefinition>;

/**
 * Get completions for a specific position in the command.
 */
const getCompletionsAtPosition = (
  node: CompletionNode,
  args: string[],
  generators: Map<string, GeneratorInfo>,
): string[] => {
  // Navigate to the correct position in the tree
  let current = node;
  const pathSoFar: string[] = [];

  for (const arg of args) {
    // Skip flags and empty args
    if (arg.startsWith("-") || !arg) continue;

    const child = current.children.get(arg);
    if (child) {
      current = child;
      pathSoFar.push(arg);
    } else {
      // Partial match - don't add to path, keep current node
      break;
    }
  }

  // Check if we have subcommands available
  const subcommands = [...current.children.keys()];

  // Check if we're at a generator
  const generatorKey = pathSoFar.join("/");
  const generatorInfo = generators.get(generatorKey);

  // Get the last arg for context
  const lastArg = args[args.length - 1] || "";
  const line = args.join(" ");

  // If we're at a generator
  if (generatorInfo) {
    // If the last arg starts with -, provide flag completions
    if (lastArg.startsWith("-")) {
      return getArgumentCompletions(generatorInfo.prompts, line, lastArg);
    }

    // If there are no subcommands and this is a leaf generator,
    // suggest flags (user pressed TAB after the generator name)
    if (subcommands.length === 0) {
      // Pass showAll=true to show all flags even without -- prefix
      return getArgumentCompletions(generatorInfo.prompts, line, "", true);
    }

    // If there are both subcommands and this is a generator,
    // show subcommands (user might want to go deeper)
    return subcommands;
  }

  // Not at a generator, show subcommands
  // Only filter if the last arg is a partial (not in pathSoFar)
  const lastPathSeg = pathSoFar[pathSoFar.length - 1];
  const isPartialArg =
    lastArg && !lastArg.startsWith("-") && lastArg !== lastPathSeg;

  if (isPartialArg) {
    return subcommands.filter((cmd) => cmd.startsWith(lastArg));
  }

  return subcommands;
};

/**
 * Load all generators and cache their prompts.
 */
const loadAllGenerators = async (
  node: CompletionNode,
  loadGenerator: GeneratorLoader,
  currentPath: string[] = [],
  cache: Map<string, GeneratorInfo> = new Map(),
): Promise<Map<string, GeneratorInfo>> => {
  for (const [name, child] of node.children) {
    const childPath = [...currentPath, name];
    const pathKey = childPath.join("/");

    if (child.indexPath) {
      try {
        const generator = await loadGenerator(child.indexPath);
        cache.set(pathKey, {
          path: childPath,
          prompts: generator.prompts,
        });
      } catch {
        // Failed to load generator, skip
      }
    }

    if (child.children.size > 0) {
      await loadAllGenerators(child, loadGenerator, childPath, cache);
    }
  }

  return cache;
};

// =============================================================================
// Completion Initialization
// =============================================================================

/**
 * Initialize shell completion for the summon CLI.
 *
 * This should be called early in the CLI lifecycle, before commander parsing,
 * because omelette needs to intercept completion requests.
 *
 * @param generatorTree - The root of the generator tree
 * @param loadGenerator - Function to load a generator from its path
 * @returns The omelette instance (for setup/cleanup methods)
 */
export const initCompletion = async (
  generatorTree: CompletionNode,
  loadGenerator: GeneratorLoader,
): Promise<omelette.Instance> => {
  // Load all generators to get their prompts
  const generators = await loadAllGenerators(generatorTree, loadGenerator);

  // Create the completion instance
  // We use a template with multiple segments to handle deep hierarchies
  // The "complete" event fires for all positions
  const complete = omelette("summon <arg1> <arg2> <arg3> <arg4> <arg5>");

  // Handle completion dynamically for all positions
  // The "complete" event receives the fragment name (arg1, arg2, etc.) and context
  complete.on("complete", (fragment, { line, reply, before }) => {
    // Parse the current line to determine what to complete
    // Remove 'summon' and filter out internal flags like --generators
    let args = line.split(/\s+/).filter(Boolean).slice(1);

    // Filter out internal CLI flags that shouldn't be part of completion context
    const internalFlags = [
      "--generators",
      "-g",
      "--compbash",
      "--compzsh",
      "--compfish",
      "--compgen",
    ];
    args = args.filter((arg, idx) => {
      // Skip internal flags and their values
      if (internalFlags.includes(arg)) return false;
      // Skip the value after an internal flag
      if (idx > 0 && internalFlags.includes(args[idx - 1])) return false;
      return true;
    });

    // Debug logging (only when SUMMON_DEBUG is set)
    if (process.env.SUMMON_DEBUG) {
      console.error("[completion] fragment:", fragment);
      console.error("[completion] line:", line);
      console.error("[completion] before:", before);
      console.error("[completion] args (filtered):", args);
    }

    // If before is empty, we're at the start of a new argument
    // If not, we're completing a partial argument
    const completions = getCompletionsAtPosition(
      generatorTree,
      args,
      generators,
    );

    if (process.env.SUMMON_DEBUG) {
      console.error("[completion] completions:", completions);
    }

    reply(completions);
  });

  // Initialize omelette (this intercepts --completion args)
  complete.init();

  return complete;
};

/**
 * Check if the current invocation is a completion request.
 * This allows us to skip normal CLI processing for completion.
 */
export const isCompletionRequest = (): boolean => {
  const args = process.argv;
  return (
    args.includes("--completion") ||
    args.includes("--completion-fish") ||
    args.includes("--compzsh") ||
    args.includes("--compbash") ||
    args.includes("--compfish") ||
    // Omelette internal completion trigger
    args.some((arg) => arg.startsWith("--compgen"))
  );
};

/**
 * Check if this is a setup or cleanup request.
 */
export const isSetupRequest = (): boolean => {
  const args = process.argv;
  return (
    args.includes("--setup-completion") || args.includes("--cleanup-completion")
  );
};

/**
 * Handle setup/cleanup requests.
 */
export const handleSetupRequest = (complete: omelette.Instance): void => {
  const args = process.argv;

  if (args.includes("--setup-completion")) {
    try {
      complete.setupShellInitFile();
      console.log("Shell completion installed successfully!");
      console.log(
        "Please restart your shell or run: source ~/.zshrc (or ~/.bashrc)",
      );
    } catch (err) {
      console.error("Failed to install completion:", (err as Error).message);
      console.error("\nManual installation:");
      console.error("  Zsh:  echo '. <(summon --completion)' >> ~/.zshrc");
      console.error(
        "  Bash: summon --completion >> ~/.summon-completion.sh && echo 'source ~/.summon-completion.sh' >> ~/.bash_profile",
      );
      console.error(
        "  Fish: echo 'summon --completion-fish | source' >> ~/.config/fish/config.fish",
      );
      process.exit(1);
    }
    process.exit(0);
  }

  if (args.includes("--cleanup-completion")) {
    try {
      complete.cleanupShellInitFile();
      console.log("Shell completion removed successfully!");
    } catch (err) {
      console.error("Failed to remove completion:", (err as Error).message);
      process.exit(1);
    }
    process.exit(0);
  }
};
