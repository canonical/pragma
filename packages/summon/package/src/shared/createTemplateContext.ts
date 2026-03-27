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
  const entryPoints = getEntryPoints(answers.type);
  const version = monorepoInfo.isMonorepo
    ? (monorepoInfo.version ?? "0.1.0")
    : "0.1.0";

  return {
    shortName: getPackageShortName(answers.name),
    name: answers.name,
    description: answers.description,
    type: answers.type,
    version,
    license: getLicense(answers.type),
    module: entryPoints.module,
    types: entryPoints.types,
    files: entryPoints.files,
    needsBuild: entryPoints.needsBuild,
    ruleset: getRuleset(answers.type, answers.withReact),
    withReact: answers.withReact,
    withStorybook: answers.withStorybook,
    withCli: answers.withCli,
    monorepoVersion: monorepoInfo.version,
    generatorName: "@canonical/summon-package",
    generatorVersion: "0.1.0",
  };
}
