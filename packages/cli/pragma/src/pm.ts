import { realpathSync } from "node:fs";

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

function detectPackageManager(
  binPath: string = process.argv[1] ?? "",
): PackageManager {
  let resolved: string;
  try {
    resolved = realpathSync(binPath);
  } catch {
    resolved = binPath;
  }

  if (resolved.includes("/.bun/")) return "bun";
  if (resolved.includes("/pnpm/")) return "pnpm";
  if (resolved.includes("/yarn/") || resolved.includes("/.yarn/"))
    return "yarn";
  return "npm";
}

const PM_COMMANDS: Record<
  PackageManager,
  {
    install: (pkg: string) => string;
    update: (pkg: string) => string;
  }
> = {
  bun: {
    install: (pkg) => `bun add -g ${pkg}`,
    update: (pkg) => `bun update -g ${pkg}`,
  },
  npm: {
    install: (pkg) => `npm install -g ${pkg}`,
    update: (pkg) => `npm update -g ${pkg}`,
  },
  pnpm: {
    install: (pkg) => `pnpm add -g ${pkg}`,
    update: (pkg) => `pnpm update -g ${pkg}`,
  },
  yarn: {
    install: (pkg) => `yarn global add ${pkg}`,
    update: (pkg) => `yarn global upgrade ${pkg}`,
  },
};

function isGlobalPrefix(path: string): boolean {
  return (
    path.includes("/.bun/") ||
    path.includes("/pnpm/") ||
    path.includes("/yarn/") ||
    path.includes("/.yarn/")
  );
}

function detectLocalInstall(
  binPath: string = process.argv[1] ?? "",
): string | undefined {
  let resolved: string;
  try {
    resolved = realpathSync(binPath);
  } catch {
    resolved = binPath;
  }

  if (!resolved.includes("node_modules/.bin")) return undefined;
  if (isGlobalPrefix(resolved)) return undefined;

  const pm = detectPackageManager(binPath);
  return `Warning: pragma is installed locally in this project.\nGlobal installation is recommended: ${PM_COMMANDS[pm].install("@canonical/pragma")}`;
}

export { detectPackageManager, detectLocalInstall, PM_COMMANDS };
export type { PackageManager };
