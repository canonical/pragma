export interface MonorepoAnswers {
  /** Monorepo name (e.g., "my-monorepo") */
  name: string;
  /** Monorepo description */
  description: string;
  /** Root license */
  license: "LGPL-3.0" | "GPL-3.0";
  /** Shared TypeScript config package */
  typescriptConfig: string;
  /** GitHub repository URL */
  repository: string;
  /** Pinned Bun version for CI */
  bunVersion: string;
  /** Run bun install after creation */
  runInstall: boolean;
  /** Initialize git repository */
  initGit: boolean;
}

export interface TemplateContext {
  /** Monorepo name */
  name: string;
  /** Monorepo description */
  description: string;
  /** License */
  license: string;
  /** TypeScript config package to extend */
  typescriptConfig: string;
  /** Author object as JSON string */
  author: string;
  /** Repository URL */
  repository: string;
  /** Bun version for CI */
  bunVersion: string;
  /** Generator name */
  generatorName: string;
  /** Generator version */
  generatorVersion: string;
  /** Index signature for EJS compatibility */
  [key: string]: unknown;
}
