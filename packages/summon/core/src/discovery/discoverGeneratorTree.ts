/**
 * Discover available generators from the filesystem.
 *
 * Scans local directories, global package manager locations, and
 * project node_modules for summon-* packages, building a tree of
 * {@link GeneratorNode} entries.
 *
 * @note Impure — performs filesystem I/O (readdir, stat, access, import).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import chalk from "chalk";
import type { GeneratorDefinition } from "../types/index.js";
import { generatorCache } from "./generatorCache.js";
import type { GeneratorNode, GeneratorOrigin } from "./types.js";

// =============================================================================
// Internal helpers
// =============================================================================

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
  origin: GeneratorOrigin = "local",
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
          origin,
        };

        // Check if this directory has an index.ts (is a runnable generator)
        try {
          await fs.access(indexPath);
          childNode.indexPath = indexPath;
        } catch {
          // No index.ts, might still have children
        }

        // Recursively discover children
        await buildGeneratorTree(childDir, childNode, origin);

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
 * Insert a generator into the tree at the given path.
 * Creates intermediate namespace nodes as needed.
 */
const insertGeneratorAtPath = (
  root: GeneratorNode,
  pathStr: string,
  generator: GeneratorDefinition,
  origin: GeneratorOrigin = "package",
): void => {
  const segments = pathStr.split("/").filter(Boolean);
  let current = root;

  // Cache the generator for later lookup
  generatorCache.set(pathStr, generator);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i] ?? "";
    const isLast = i === segments.length - 1;

    if (!current.children.has(segment)) {
      current.children.set(segment, {
        name: segment,
        path: "",
        children: new Map(),
        origin,
      });
    }

    const child = current.children.get(segment);
    if (!child) continue; // Should never happen since we just set it

    if (isLast) {
      // Mark as having a generator (use path as synthetic indexPath)
      child.indexPath = `cache:${pathStr}`;
      child.origin = origin;
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
  origin: GeneratorOrigin = "package",
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
        insertGeneratorAtPath(
          root,
          cmdPath,
          generator as GeneratorDefinition,
          origin,
        );
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
 * Get bun's global node_modules directory.
 * Default is ~/.bun/install/global/node_modules
 */
const getBunGlobalNodeModules = (): string => {
  const bunInstallDir =
    process.env.BUN_INSTALL ?? path.join(process.env.HOME ?? "~", ".bun");
  return path.join(bunInstallDir, "install", "global", "node_modules");
};

/**
 * Get npm's global node_modules directory.
 * Uses `npm root -g` equivalent logic.
 */
const getNpmGlobalNodeModules = async (): Promise<string | null> => {
  // Check common npm global locations
  const npmPrefix = process.env.NPM_CONFIG_PREFIX;
  if (npmPrefix) {
    return path.join(npmPrefix, "lib", "node_modules");
  }

  // Try NVM location
  const nvmDir = process.env.NVM_DIR;
  if (nvmDir) {
    // NVM stores globals in the current node version's lib/node_modules
    const nodeVersion = process.version;
    const nvmNodeModules = path.join(
      nvmDir,
      "versions",
      "node",
      nodeVersion,
      "lib",
      "node_modules",
    );
    try {
      await fs.access(nvmNodeModules);
      return nvmNodeModules;
    } catch {
      // NVM path doesn't exist
    }
  }

  // Fallback: check common system locations
  const commonPaths = [
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
    path.join(process.env.HOME ?? "~", ".npm-global", "lib", "node_modules"),
  ];

  for (const p of commonPaths) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // Path doesn't exist
    }
  }

  return null;
};

/**
 * Scan a node_modules directory for summon-* packages.
 */
const scanNodeModulesForSummonPackages = async (
  nodeModulesDir: string,
  root: GeneratorNode,
  origin: GeneratorOrigin = "global",
): Promise<void> => {
  try {
    await fs.access(nodeModulesDir);
    const entries = await fs.readdir(nodeModulesDir);

    for (const entry of entries) {
      const entryPath = path.join(nodeModulesDir, entry);

      if (entry.startsWith("@")) {
        // Scoped packages
        if (!(await isDirectory(entryPath))) continue;
        try {
          const scopedEntries = await fs.readdir(entryPath);
          for (const scopedEntry of scopedEntries) {
            if (scopedEntry.startsWith("summon-")) {
              const pkgDir = path.join(entryPath, scopedEntry);
              if (await isDirectory(pkgDir)) {
                await processPackage(
                  `${entry}/${scopedEntry}`,
                  pkgDir,
                  root,
                  origin,
                );
              }
            }
          }
        } catch {
          // Scope directory doesn't exist
        }
      } else if (entry.startsWith("summon-")) {
        if (await isDirectory(entryPath)) {
          await processPackage(entry, entryPath, root, origin);
        }
      }
    }
  } catch {
    // Directory doesn't exist - that's fine
  }
};

/**
 * Discover globally installed summon-* packages.
 * Looks in global package manager locations:
 * 1. Bun global packages (~/.bun/install/global/node_modules)
 * 2. NPM global packages (npm root -g)
 *
 * Users can link packages globally using:
 *   bun link     # from the package directory
 *   npm link     # from the package directory
 */
const discoverGlobalPackages = async (root: GeneratorNode): Promise<void> => {
  // 1. Bun global packages
  const bunGlobalNodeModules = getBunGlobalNodeModules();
  await scanNodeModulesForSummonPackages(bunGlobalNodeModules, root, "global");

  // 2. NPM global packages
  const npmGlobalNodeModules = await getNpmGlobalNodeModules();
  if (npmGlobalNodeModules) {
    await scanNodeModulesForSummonPackages(
      npmGlobalNodeModules,
      root,
      "global",
    );
  }
};

// =============================================================================
// Public API
// =============================================================================

interface DiscoverOptions {
  /** When set, ONLY load from this path (for testing). */
  explicitPath?: string;
  /** Directory containing built-in generators. Defaults to ../generators relative to this file. */
  builtinDir?: string;
}

/**
 * Create the root generator tree from all sources.
 *
 * When `explicitPath` is provided, ONLY load from that path (for testing).
 *
 * Otherwise, priority (highest to lowest, later overrides earlier):
 * 1. Built-in generators from \@canonical/summon
 * 2. Global packages (bun link / npm link locations)
 * 3. Project ./node_modules/summon-* packages (highest priority)
 *
 * @note Impure — scans the filesystem and imports generator modules.
 */
export default async function discoverGeneratorTree(
  explicitPathOrOptions?: string | DiscoverOptions,
): Promise<GeneratorNode> {
  const options: DiscoverOptions =
    typeof explicitPathOrOptions === "string"
      ? { explicitPath: explicitPathOrOptions }
      : (explicitPathOrOptions ?? {});
  const { explicitPath, builtinDir } = options;
  const root: GeneratorNode = {
    name: "root",
    path: "",
    children: new Map(),
  };

  if (explicitPath) {
    // Explicit path mode: ONLY load from the specified path
    const absolutePath = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(process.cwd(), explicitPath);

    // Check if it's a package with package.json (barrel export)
    const pkgJsonPath = path.join(absolutePath, "package.json");
    try {
      await fs.access(pkgJsonPath);
      // It's a package - use processPackage to load from barrel
      await processPackage(
        path.basename(absolutePath),
        absolutePath,
        root,
        "local",
      );
    } catch {
      // Not a package - scan directory for generators
      await buildGeneratorTree(absolutePath, root, "local");
    }
    return root;
  }

  // Normal discovery mode (order matters: later sources override earlier)

  // 1. Built-in generators (lowest priority)
  const defaultBuiltinDir = path.join(__dirname, "..", "generators");
  await buildGeneratorTree(builtinDir ?? defaultBuiltinDir, root, "builtin");

  // 2-3. Global packages and generators
  await discoverGlobalPackages(root);

  // 3. node_modules packages (project-level, highest priority)
  await discoverNodeModulesPackages(
    path.join(process.cwd(), "node_modules"),
    root,
  );

  return root;
}
