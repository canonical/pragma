type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

interface InstallSource {
  readonly packageManager: PackageManager;
  readonly scope: "global" | "local";
  readonly label: string;
}

export type { PackageManager };

export type { InstallSource };
