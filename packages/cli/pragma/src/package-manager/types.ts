/** Supported Node.js package managers. */
type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

interface InstallSource {
  readonly packageManager: PackageManager;
  readonly scope: "global" | "local";
  readonly label: string;
}

export type { InstallSource, PackageManager };
