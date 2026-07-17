import pkg from "../../package.json" with { type: "json" };
import getEntryPoints from "./config/getEntryPoints.js";
import getLicense from "./config/getLicense.js";
import getRuleset from "./config/getRuleset.js";
import getPackageShortName from "./getPackageShortName.js";
import type { MonorepoInfo, PackageAnswers, TemplateContext } from "./types.js";

/**
 * Create template context from answers.
 */
export default function createTemplateContext(
  answers: PackageAnswers,
  monorepoInfo: MonorepoInfo,
): TemplateContext {
  const entryPoints = getEntryPoints(answers.type, answers.framework);
  const version = monorepoInfo.isMonorepo
    ? (monorepoInfo.version ?? "0.1.0")
    : "0.1.0";
  // @canonical/* dependency ranges track this generator's own version, which
  // is lerna-versioned in lockstep with the configs. Standalone runs (no
  // monorepo) fall back to the published generator version rather than the
  // dead 0.1.0 range.
  const configsVersion = monorepoInfo.version ?? pkg.version;

  return {
    shortName: getPackageShortName(answers.name),
    name: answers.name,
    description: answers.description,
    type: answers.type,
    version,
    configsVersion,
    license: getLicense(answers.type),
    module: entryPoints.module,
    types: entryPoints.types,
    files: entryPoints.files,
    needsBuild: entryPoints.needsBuild,
    ruleset: getRuleset(answers.type, answers.framework),
    framework: answers.framework,
    withStorybook: answers.withStorybook,
    withCli: answers.withCli,
    monorepoVersion: monorepoInfo.version,
    generatorName: "@canonical/summon-package",
    generatorVersion: "0.1.0",
  };
}
