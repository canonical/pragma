import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * Result of resolving a package's public barrel exports.
 */
export interface BarrelExports {
  /** All names exported (directly or re-exported) from the barrel */
  names: Set<string>;

  /** Entry file the resolution started from, if one was found */
  entryPath?: string;

  /** Non-fatal resolution problems (unresolvable modules, ...) */
  warnings: string[];
}

const ENTRY_CANDIDATES = ["src/index.ts", "src/index.tsx"];

const RE_EXPORT_STAR = /export\s+(?:type\s+)?\*\s+from\s+["']([^"']+)["']/g;
const RE_EXPORT_NAMED =
  /export\s+(?:type\s+)?\{([^}]*)\}(?:\s*from\s+["']([^"']+)["'])?/g;
const RE_EXPORT_DECLARATION =
  /export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;

/** Strip comments so export statements inside docs are not misread. */
function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

async function tryReadFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Resolve a relative module specifier (as written in an import/export
 * statement) to an existing source file.
 */
async function resolveModule(
  fromFile: string,
  specifier: string,
): Promise<{ path: string; content: string } | undefined> {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base.replace(/\.js$/, ".ts"),
    base.replace(/\.js$/, ".tsx"),
    base.replace(/\.jsx$/, ".tsx"),
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    base,
  ];

  for (const candidate of candidates) {
    const content = await tryReadFile(candidate);
    if (content !== undefined) {
      return { path: candidate, content };
    }
  }

  return undefined;
}

function parseNamedExports(clause: string): string[] {
  return clause
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const withoutType = part.replace(/^type\s+/, "");
      const asMatch = /\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(withoutType);
      if (asMatch) {
        return asMatch[1];
      }
      return withoutType;
    })
    .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name));
}

async function collectFromFile(
  filePath: string,
  content: string,
  result: BarrelExports,
  visited: Set<string>,
): Promise<void> {
  if (visited.has(filePath)) {
    return;
  }
  visited.add(filePath);

  const stripped = stripComments(content);

  for (const match of stripped.matchAll(RE_EXPORT_STAR)) {
    const resolved = await resolveModule(filePath, match[1]);
    if (resolved) {
      await collectFromFile(resolved.path, resolved.content, result, visited);
    } else {
      result.warnings.push(
        `could not resolve "${match[1]}" re-exported from ${filePath}`,
      );
    }
  }

  for (const match of stripped.matchAll(RE_EXPORT_NAMED)) {
    for (const name of parseNamedExports(match[1])) {
      result.names.add(name);
    }
  }

  for (const match of stripped.matchAll(RE_EXPORT_DECLARATION)) {
    result.names.add(match[1]);
  }
}

/**
 * Collect the set of symbol names exported from a package's public barrel
 * (its `src/index.ts`), following `export ... from` chains through relative
 * modules.
 */
export async function resolveBarrelExports(
  packageDir: string,
): Promise<BarrelExports> {
  const result: BarrelExports = { names: new Set(), warnings: [] };

  for (const candidate of ENTRY_CANDIDATES) {
    const entryPath = join(packageDir, candidate);
    const content = await tryReadFile(entryPath);
    if (content !== undefined) {
      result.entryPath = entryPath;
      await collectFromFile(entryPath, content, result, new Set());
      return result;
    }
  }

  result.warnings.push(
    `no public barrel found in ${packageDir} (tried ${ENTRY_CANDIDATES.join(", ")})`,
  );
  return result;
}
