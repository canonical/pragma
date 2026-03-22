import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import detectPackageManager from "./detectPackageManager.js";
import type { InstallSource } from "./types.js";

function isGlobalPrefix(path: string): boolean {
  return (
    path.includes("/.bun/") ||
    path.includes("/pnpm/") ||
    path.includes("/yarn/") ||
    path.includes("/.yarn/")
  );
}

function resolvePath(binPath: string): string {
  try {
    return realpathSync(binPath);
  } catch {
    return binPath;
  }
}

function findPackageName(startPath: string): string | undefined {
  let current = dirname(startPath);

  while (true) {
    const packageJsonPath = join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const parsed = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
          name?: string;
        };
        return parsed.name;
      } catch {
        return undefined;
      }
    }

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isLocalCheckout(path: string): boolean {
  if (path.includes("/node_modules/")) return false;
  if (!path.endsWith("/src/bin.ts") && !path.endsWith("/dist/pragma")) {
    return false;
  }

  return findPackageName(path) === "@canonical/pragma";
}

function detectRuntimePackageManager(): InstallSource["packageManager"] {
  const execPath = process.execPath;
  const npmExecPath = process.env.npm_execpath;
  const userAgent = process.env.npm_config_user_agent ?? "";

  if (execPath) {
    const fromExec = detectPackageManager(execPath);
    if (fromExec !== "npm") return fromExec;
  }

  if (npmExecPath) {
    const fromNpmExec = detectPackageManager(npmExecPath);
    if (fromNpmExec !== "npm") return fromNpmExec;
  }

  if (userAgent.startsWith("bun/")) return "bun";
  if (userAgent.startsWith("pnpm/")) return "pnpm";
  if (userAgent.startsWith("yarn/")) return "yarn";

  return "npm";
}

export default function detectInstallSource(
  binPath: string = process.argv[1] ?? "",
): InstallSource {
  const resolved = resolvePath(binPath);
  const localCheckout = isLocalCheckout(resolved);
  const packageManager = localCheckout
    ? detectRuntimePackageManager()
    : detectPackageManager(binPath);

  if (
    (resolved.includes("node_modules/.bin") && !isGlobalPrefix(resolved)) ||
    localCheckout
  ) {
    return {
      packageManager,
      scope: "local",
      label: `${packageManager} (local)`,
    };
  }

  return {
    packageManager,
    scope: "global",
    label: `${packageManager} (global)`,
  };
}
