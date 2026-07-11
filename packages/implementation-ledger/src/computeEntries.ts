import { access, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { glob } from "tinyglobby";
import { deriveAnnotatedSymbol } from "./deriveSymbol.js";
import { resolveBarrelExports } from "./resolveBarrelExports.js";
import { scanAnnotations } from "./scanAnnotations.js";
import type {
  AvailableImplementation,
  LedgerAnnotation,
  LedgerEntry,
  PackageDsConfig,
  RootConfig,
} from "./types.js";

export interface AnnotatedPackage {
  /** Absolute path to the package directory */
  path: string;

  /** Path relative to the monorepo root */
  relativePath: string;

  packageName: string;
  packageVersion: string;
  dsConfig: PackageDsConfig;
}

export interface ComputedEntry {
  entry: LedgerEntry;
  packagePath: string;
  warnings: string[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Walk up from `startDir` to the monorepo root (where ds.config.json lives) */
export async function findRootDir(startDir: string): Promise<string> {
  let dir = resolve(startDir);
  while (!(await fileExists(join(dir, "ds.config.json")))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `could not find ds.config.json in ${startDir} or any parent directory`,
      );
    }
    dir = parent;
  }
  return dir;
}

export async function loadRootConfig(rootDir: string): Promise<RootConfig> {
  const content = await readFile(join(rootDir, "ds.config.json"), "utf-8");
  return JSON.parse(content) as RootConfig;
}

/**
 * Discover workspace packages that participate in design system collection
 * (i.e. carry a design-system.json), mirroring scripts/collect-implementations.ts.
 */
export async function discoverAnnotatedPackages(
  rootDir: string,
): Promise<AnnotatedPackage[]> {
  const rootPkg = JSON.parse(
    await readFile(join(rootDir, "package.json"), "utf-8"),
  ) as { workspaces?: string[] };

  const dirs: string[] = [];
  for (const pattern of rootPkg.workspaces ?? []) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      onlyDirectories: true,
      absolute: true,
    });
    // tinyglobby returns directories with a trailing slash; normalize so
    // paths compare cleanly (e.g. against a resolved --package argument).
    dirs.push(...matches.map((dir) => resolve(dir)));
  }
  dirs.sort();

  const packages: AnnotatedPackage[] = [];
  for (const dir of dirs) {
    const dsConfigPath = join(dir, "design-system.json");
    if (!(await fileExists(dsConfigPath))) {
      continue;
    }
    const dsConfig = JSON.parse(
      await readFile(dsConfigPath, "utf-8"),
    ) as PackageDsConfig;
    const pkg = JSON.parse(
      await readFile(join(dir, "package.json"), "utf-8"),
    ) as { name: string; version: string };

    packages.push({
      path: dir,
      relativePath: relative(rootDir, dir),
      packageName: pkg.name,
      packageVersion: pkg.version,
      dsConfig,
    });
  }

  return packages;
}

interface BlockGroup {
  blockUri: string;
  annotations: LedgerAnnotation[];
}

/** Storybook stories declare `const meta = ...`; never a consumer symbol. */
const STORIES_FILE = /\.stories\.[^/]+$/;

/** Last-resort symbol guess from a block slug: "contextual_menu" -> "ContextualMenu" */
function pascalCaseSlug(blockUri: string): string {
  const slug = blockUri.split(".").pop() ?? "";
  return slug
    .split(/[-_]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function groupByBlockUri(annotations: LedgerAnnotation[]): BlockGroup[] {
  const groups = new Map<string, BlockGroup>();
  for (const annotation of annotations) {
    let group = groups.get(annotation.blockUri);
    if (!group) {
      group = { blockUri: annotation.blockUri, annotations: [] };
      groups.set(annotation.blockUri, group);
    }
    group.annotations.push(annotation);
  }
  return [...groups.values()].sort((a, b) =>
    a.blockUri.localeCompare(b.blockUri),
  );
}

/**
 * Resolve a block group to one AvailableImplementation:
 * - version: explicit `@x.y.z` override if the annotations agree on one,
 *   otherwise the package version. Conflicting overrides fail loudly.
 * - symbol: prefer an annotation whose derived symbol is exported from the
 *   package's public barrel; fall back to the first derivable symbol.
 */
async function resolveBlock(
  group: BlockGroup,
  pkg: AnnotatedPackage,
  barrelNames: Set<string>,
  warnings: string[],
): Promise<AvailableImplementation> {
  const overrides = new Set(
    group.annotations
      .map((annotation) => annotation.version)
      .filter((version): version is string => version !== undefined),
  );
  if (overrides.size > 1) {
    throw new Error(
      `conflicting @implements version overrides for ${group.blockUri} in ` +
        `${pkg.packageName}: ${[...overrides].join(", ")}`,
    );
  }
  const blockVersion = [...overrides][0] ?? pkg.packageVersion;
  const isDraft = group.annotations.every((annotation) => annotation.isDraft);

  const fileCache = new Map<string, string>();
  const candidates: { name: string; isTypeOnly: boolean }[] = [];
  for (const annotation of group.annotations) {
    if (STORIES_FILE.test(annotation.filePath)) {
      continue;
    }
    let content = fileCache.get(annotation.filePath);
    if (content === undefined) {
      content = await readFile(annotation.filePath, "utf-8");
      fileCache.set(annotation.filePath, content);
    }
    const symbol = deriveAnnotatedSymbol(content, annotation.index);
    if (
      symbol &&
      !candidates.some((candidate) => candidate.name === symbol.name)
    ) {
      candidates.push({ name: symbol.name, isTypeOnly: symbol.isTypeOnly });
    }
  }
  const slugGuess = pascalCaseSlug(group.blockUri);
  if (
    slugGuess !== "" &&
    !candidates.some((candidate) => candidate.name === slugGuess)
  ) {
    candidates.push({ name: slugGuess, isTypeOnly: false });
  }

  const verified = candidates.find((candidate) =>
    barrelNames.has(candidate.name),
  );
  const chosen = verified ?? candidates[0];

  const impl: AvailableImplementation = {
    blockUri: group.blockUri,
    blockVersion,
    importVerified: verified !== undefined,
    isDraft,
  };

  if (chosen) {
    impl.exportedSymbol = chosen.name;
    impl.importStatement = `import ${chosen.isTypeOnly ? "type " : ""}{ ${chosen.name} } from "${pkg.packageName}";`;
    if (!verified) {
      warnings.push(
        `${pkg.packageName}: symbol "${chosen.name}" for ${group.blockUri} ` +
          "is not exported from the package's public barrel; import statement is a best guess",
      );
    }
  } else {
    warnings.push(
      `${pkg.packageName}: could not derive an exported symbol for ${group.blockUri}; ` +
        "no import statement recorded",
    );
  }

  return impl;
}

/**
 * Compute the ledger entry for one package at its current package.json
 * version. Returns undefined when the package has no valid annotations
 * (no entry is recorded for it).
 */
export async function computeEntryForPackage(
  pkg: AnnotatedPackage,
  rootConfig: RootConfig,
): Promise<ComputedEntry | undefined> {
  const pattern =
    pkg.dsConfig.pattern ??
    rootConfig.defaults?.patterns?.[pkg.dsConfig.platform] ??
    "src/**/*.ts";

  const annotations = (await scanAnnotations(pattern, pkg.path)).filter(
    (annotation) => annotation.prefix === rootConfig.prefix.short,
  );
  if (annotations.length === 0) {
    return undefined;
  }

  const warnings: string[] = [];
  const barrel = await resolveBarrelExports(pkg.path);
  warnings.push(
    ...barrel.warnings.map((warning) => `${pkg.packageName}: ${warning}`),
  );

  const implementations: AvailableImplementation[] = [];
  for (const group of groupByBlockUri(annotations)) {
    implementations.push(
      await resolveBlock(group, pkg, barrel.names, warnings),
    );
  }

  return {
    entry: {
      packageName: pkg.packageName,
      packageVersion: pkg.packageVersion,
      implementations,
    },
    packagePath: pkg.relativePath,
    warnings,
  };
}
