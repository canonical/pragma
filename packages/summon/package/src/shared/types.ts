export type PackageType = "tool-ts" | "library" | "css";

/**
 * The UI framework a generated `library` targets.
 *
 * A three-valued select rather than a boolean: `none` is a plain TypeScript
 * library built with `tsc`, `react` adds the JSX toolchain on top of that same
 * build, and `svelte` swaps the entire build/test surface over to
 * `@sveltejs/package`. Only `library` packages carry a framework — see
 * {@link import("../resolveFramework.js").default}.
 */
export type Framework = "none" | "react" | "svelte";

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

export interface PackageAnswers {
  /** Full package name (e.g., @canonical/my-package or my-package) */
  name: string;
  /** Package type */
  type: PackageType;
  /** Package description */
  description: string;
  /** UI framework the package targets (`library` packages only) */
  framework: Framework;
  /** Include Storybook setup */
  withStorybook: boolean;
  /** Include CLI binary entry point */
  withCli: boolean;
  /** Emit a .github/PULL_REQUEST_TEMPLATE.md (opt-in; monorepos read only the root template) */
  withPrTemplate: boolean;
  /** Run package manager install after creation */
  runInstall: boolean;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  version?: string;
}

export interface TemplateContext {
  /** Package short name (without scope) */
  shortName: string;
  /** Full package name (as entered, e.g., @canonical/my-package) */
  name: string;
  /** Package description */
  description: string;
  /** Package type */
  type: PackageType;
  /** Package version */
  version: string;
  /** License */
  license: string;
  /** Whether this package type needs a build step */
  needsBuild: boolean;
  /** `module` entry point the generated manifest advertises */
  moduleEntry: string;
  /** `types` entry point the manifest advertises, or null for CSS packages */
  typesEntry: string | null;
  /**
   * Version line to depend on for `@canonical/*` packages.
   *
   * Taken from this generator's own version, not from the host repository:
   * the generator ships from the same fixed-version monorepo as the config
   * packages it scaffolds a dependency on, so its version is the published
   * line those packages exist on. The host repository's version says nothing
   * about them.
   */
  canonicalVersion: string;
  /** Webarchitect ruleset */
  ruleset: string;
  /** UI framework the package targets, after reconciliation */
  framework: Framework;
  /** Include Storybook */
  withStorybook: boolean;
  /** Include CLI */
  withCli: boolean;
  /** Index signature for EJS compatibility */
  [key: string]: unknown;
}
