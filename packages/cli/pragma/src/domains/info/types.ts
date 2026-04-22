/** Summary of how a single package is resolved. */
export interface PackageRefSummary {
  readonly pkg: string;
  readonly source: "npm" | "file" | "git";
  readonly detail: string;
}

/** Data collected by `pragma info` for rendering. */
export interface InfoData {
  readonly version: string;
  readonly pm: string;
  readonly installSource: string;
  readonly configPath: string;
  readonly tier: string | undefined;
  readonly tierChain: readonly string[];
  readonly channel: string;
  readonly channelReleases: readonly string[];
  readonly update:
    | {
        readonly current: string;
        readonly latest: string;
        readonly command: string;
      }
    | undefined;
  readonly updateSkipped: boolean;
  readonly store:
    | { readonly tripleCount: number; readonly graphNames: readonly string[] }
    | undefined;
  readonly packageRefs?: readonly PackageRefSummary[];
}

/** Data collected by `pragma upgrade` for rendering. */
export interface UpgradeData {
  readonly pm: string;
  readonly current: string;
  readonly latest: string | undefined;
  readonly command: string;
  readonly dryRun: boolean;
  readonly alreadyLatest: boolean;
  readonly offline: boolean;
  readonly executed: boolean;
}

/** Result of checking the npm registry for the latest package version. */
export interface RegistryCheckResult {
  readonly latest: string;
  readonly distTag: string;
}

/** Summary statistics from the ke store (triple count and named graphs). */
export interface StoreSummary {
  readonly tripleCount: number;
  readonly graphNames: readonly string[];
}
