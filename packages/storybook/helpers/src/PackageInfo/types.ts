/**
 * Design system tier levels ordered from foundational to specialized.
 */
export type Tier = "global" | "global_form" | "apps" | "apps_wpe";

/**
 * Supported UI frameworks.
 */
export type Framework = "react" | "svelte" | "web-components";

/**
 * Package development status.
 */
export type Status = "stable" | "prerelease" | "deprecated";

/**
 * External links for a package.
 */
export interface PackageLinks {
  /** Source repository URL */
  source?: string;
  /** npm package URL */
  npm?: string;
  /** Ontology specification URL */
  ontology?: string;
}

/**
 * Props for the PackageInfo component.
 */
export interface PackageInfoProps {
  /** Package display name */
  name: string;

  /** Package version (semver) */
  version?: string;

  /** Design system tier */
  tier: Tier;

  /** UI framework */
  framework: Framework;

  /** Development status */
  status?: Status;

  /** List of key dependencies */
  dependencies?: string[];

  /** External links */
  links?: PackageLinks;

  /** Optional CSS class name */
  className?: string;
}
