/**
 * Template context creation and config derivation
 *
 * Pure functions that derive build/license/config decisions from answers
 * and create the template context used throughout the generator.
 */

import { getPackageShortName } from "./strings.js";
import type {
  DerivedConfig,
  PackageAnswers,
  TemplateContext,
} from "./types.js";

// =============================================================================
// Derivation
// =============================================================================

/**
 * Derive all build/license/config decisions from the answer set.
 * Implements the decision tree derivation rules from the design doc.
 */
export const derivePackageConfig = (answers: PackageAnswers): DerivedConfig => {
  const isCSS = answers.content === "css";
  const hasCLI = answers.withCli;
  const isComponentLib = answers.isComponentLibrary;
  const hasFramework = answers.framework !== "none";

  const needsBuild = !isCSS && !hasCLI;
  const license = hasCLI && !isComponentLib ? "GPL-3.0" : "LGPL-3.0";
  const storybook = isComponentLib;

  const module_ = isCSS
    ? "src/index.css"
    : needsBuild
      ? "dist/esm/index.js"
      : "src/index.ts";

  const types = isCSS
    ? null
    : needsBuild
      ? "dist/types/index.d.ts"
      : "src/index.ts";

  const files = needsBuild ? ["dist"] : ["src"];

  const ruleset = isCSS
    ? "base"
    : hasFramework
      ? `package-${answers.framework}`
      : hasCLI
        ? "tool-ts"
        : "library";

  return {
    needsBuild,
    license,
    storybook,
    module: module_,
    types,
    files,
    ruleset,
  };
};

// =============================================================================
// Template Context
// =============================================================================

/**
 * Create template context from answers and detected info
 */
export const createTemplateContext = (
  answers: PackageAnswers,
  version: string,
  monorepoVersion?: string,
): TemplateContext => {
  const config = derivePackageConfig(answers);

  return {
    shortName: getPackageShortName(answers.name),
    name: answers.name,
    description: answers.description,
    content: answers.content,
    framework: answers.framework,
    isComponentLibrary: answers.isComponentLibrary,
    withCli: answers.withCli,
    version,
    license: config.license,
    module: config.module,
    types: config.types,
    files: config.files,
    needsBuild: config.needsBuild,
    storybook: config.storybook,
    ruleset: config.ruleset,
    monorepoVersion,
    generatorName: "@canonical/summon-package",
    generatorVersion: "0.2.0",
  };
};
