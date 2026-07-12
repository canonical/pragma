/**
 * A single `@implements` annotation found in a source file.
 *
 * Annotation grammar (a superset of the one used by the existing
 * `collect-implementations` tooling — see `design-system/src/collect`):
 *
 *   @implements ds:global.component.button
 *   @implements ds:global.component.button@4.2.0        <- per-block version override
 *   @implements ds:global.component.button [draft]
 *   @implements ds:global.component.button@4.2.0 [draft]
 *
 * When no `@<version>` suffix is present, the block version defaults to the
 * version of the npm package that contains the annotation.
 */
export interface LedgerAnnotation {
  /** Absolute path to the source file */
  filePath: string;

  /** The block URI being implemented (e.g. "ds:global.component.button") */
  blockUri: string;

  /** The prefix used in the annotation (e.g. "ds") */
  prefix?: string;

  /** Optional per-block version override from the `@x.y.z` suffix */
  version?: string;

  /** Whether the annotation carries a `[draft]` marker */
  isDraft: boolean;

  /** Character offset of the annotation within the file */
  index: number;
}

/**
 * One design system block that a (package, version) pair makes available.
 */
export interface AvailableImplementation {
  /** Prefixed spec URI (e.g. "ds:global.component.button") */
  blockUri: string;

  /** Version of the block made available (override or package version) */
  blockVersion: string;

  /** Exported symbol a consumer imports (e.g. "Button") */
  exportedSymbol?: string;

  /** Full import statement a consumer would use */
  importStatement?: string;

  /** Whether the symbol was verified against the package's public barrel */
  importVerified: boolean;

  /** Whether the implementation is marked as a draft */
  isDraft: boolean;
}

/**
 * A ledger entry: everything one (npm package, version) pair makes available.
 */
export interface LedgerEntry {
  /** npm package name (e.g. "@canonical/react-ds-global") */
  packageName: string;

  /** package.json version at the time of recording */
  packageVersion: string;

  /** Blocks made available, sorted by blockUri */
  implementations: AvailableImplementation[];
}

/** Prefix configuration for the design system namespace */
export interface LedgerPrefix {
  /** Short prefix (e.g. "ds") */
  short: string;

  /** Full namespace URI (e.g. "https://ds.canonical.com/") */
  namespace: string;
}

/** Root-level ds.config.json (subset used by the ledger) */
export interface RootConfig {
  prefix: LedgerPrefix;
  defaults?: {
    patterns?: Record<string, string>;
  };
}

/** Package-level design-system.json (subset used by the ledger) */
export interface PackageDsConfig {
  platform: string;
  pattern?: string;
}

/** A mismatch between a recorded entry and freshly computed content */
export interface LedgerMismatch {
  key: string;
  recorded: LedgerEntry;
  computed: LedgerEntry;
}
