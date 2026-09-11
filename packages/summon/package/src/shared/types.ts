export type PackageType = "tool-ts" | "library" | "css";

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

export interface PackageAnswers {
  /** Full package name (e.g., @canonical/my-package or my-package) */
  name: string;
  /** Package type */
  type: PackageType;
  /** Package description */
  description: string;
  /** Include React dependencies */
  withReact: boolean;
  /** Include Storybook setup */
  withStorybook: boolean;
  /** Include CLI binary entry point */
  withCli: boolean;
  /** Emit a .github/PULL_REQUEST_TEMPLATE.md (opt-in; monorepos read only the root template) */
  withPrTemplate: boolean;
  /** Run package manager install after creation */
  runInstall: boolean;
  /** The cascade layer this package's stylesheets are wrapped in, if it has one.
   * The generator copies the name and holds no opinion about it. */
  componentLayer?: string;
  /** A stylesheet declaring the layer order, imported before the layer is
   * declared, so the name is placed after the ones that file fixes. */
  layerOrderFrom?: string;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  version?: string;
}

export interface TemplateContext {
  /** The cascade layer this package's stylesheets sit in, if it stated one */
  componentLayer?: string;
  /** The stylesheet whose order statement the entry reads first, if it stated one */
  layerOrderFrom?: string;
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
  /** Include React */
  withReact: boolean;
  /** Include Storybook */
  withStorybook: boolean;
  /** Include CLI */
  withCli: boolean;
  /** Index signature for EJS compatibility */
  [key: string]: unknown;
}
