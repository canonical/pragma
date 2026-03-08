/**
 * Shared utilities for monorepo generator
 */

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate monorepo name (simple kebab-case identifier)
 */
export const validateMonorepoName = (value: unknown): true | string => {
  if (!value || typeof value !== "string") {
    return "Monorepo name is required";
  }

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(value)) {
    return "Name must be lowercase kebab-case (e.g., my-monorepo)";
  }

  return true;
};

/**
 * Validate repository URL
 */
export const validateRepository = (value: unknown): true | string => {
  if (!value || typeof value !== "string") {
    return true; // Optional field
  }

  if (!value.startsWith("https://github.com/")) {
    return "Repository URL must start with https://github.com/";
  }

  return true;
};

// =============================================================================
// Template Context
// =============================================================================

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

/**
 * Create template context from answers
 */
export const createTemplateContext = (
  answers: MonorepoAnswers,
): TemplateContext => {
  return {
    name: answers.name,
    description: answers.description,
    license: answers.license,
    typescriptConfig: answers.typescriptConfig,
    author: JSON.stringify(
      { email: "webteam@canonical.com", name: "Canonical Webteam" },
      null,
      4,
    ),
    repository: answers.repository,
    bunVersion: answers.bunVersion,
    generatorName: "@canonical/summon-monorepo",
    generatorVersion: "0.1.0",
  };
};
