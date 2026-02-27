/**
 * Shared type definitions for package generator
 */

/** Map of package name → resolved version (exact, e.g. "19.2.4") */
export type VersionMap = Record<string, string>;

export type ContentType = "typescript" | "css";

export type Framework = "react" | "none";

export interface PackageAnswers {
  /** Full package name (e.g., @canonical/my-package or my-package) */
  name: string;
  /** Package description */
  description: string;
  /** What does the package contain? */
  content: ContentType;
  /** Does it use a web framework? (only when content=typescript) */
  framework: Framework;
  /** Does it export UI components? (only when framework !== "none") */
  isComponentLibrary: boolean;
  /** Does it have a CLI entry point? (only when not a component library) */
  withCli: boolean;
  /** Run package manager install after creation */
  runInstall: boolean;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  version?: string;
}

export interface DerivedConfig {
  needsBuild: boolean;
  license: string;
  storybook: boolean;
  module: string;
  types: string | null;
  files: string[];
  ruleset: string;
}

export interface TemplateContext {
  /** Package short name (without scope) */
  shortName: string;
  /** Full package name */
  name: string;
  /** Package description */
  description: string;
  /** Content type (from answers) */
  content: ContentType;
  /** Framework (from answers) */
  framework: Framework;
  /** Whether it exports UI components (from answers) */
  isComponentLibrary: boolean;
  /** Whether it has a CLI (from answers) */
  withCli: boolean;
  /** Package version */
  version: string;
  /** License (derived) */
  license: string;
  /** Module entry point (derived) */
  module: string;
  /** Types entry point (derived, null for CSS) */
  types: string | null;
  /** Files to include in package (derived) */
  files: string[];
  /** Whether a build step is needed (derived) */
  needsBuild: boolean;
  /** Whether Storybook is included (derived) */
  storybook: boolean;
  /** Webarchitect ruleset (derived) */
  ruleset: string;
  /** Monorepo version (if applicable) */
  monorepoVersion?: string;
  /** Generator name */
  generatorName: string;
  /** Generator version */
  generatorVersion: string;
  /** Index signature for EJS compatibility */
  [key: string]: unknown;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface TemplatedFile {
  templatePath: string;
  destPath: string;
}

export interface FileManifest {
  dirs: string[];
  files: GeneratedFile[];
  templates: TemplatedFile[];
}
