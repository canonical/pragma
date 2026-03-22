/**
 * Types for the info + upgrade domain.
 */

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
}

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

export interface RegistryCheckResult {
  readonly latest: string;
  readonly distTag: string;
}

export interface StoreSummary {
  readonly tripleCount: number;
  readonly graphNames: readonly string[];
}
