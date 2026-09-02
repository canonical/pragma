import getEntryPoints from "./config/getEntryPoints.js";
import getLicense from "./config/getLicense.js";
import getRuleset from "./config/getRuleset.js";
import getPackageShortName from "./getPackageShortName.js";
import { packageVersion } from "./packageVersion.js";
import { resolveAnswers } from "./resolveFramework.js";
import type { MonorepoInfo, PackageAnswers, TemplateContext } from "./types.js";

/**
 * Create template context from answers.
 *
 * Reconciles the answers first (`resolveAnswers`), so no template can ever be
 * rendered from a combination the generator warned about — the manifest and
 * the warning always describe the same package.
 */
export default function createTemplateContext(
  rawAnswers: PackageAnswers,
  monorepoInfo: MonorepoInfo,
): TemplateContext {
  const { answers } = resolveAnswers(rawAnswers);
  const entryPoints = getEntryPoints(answers.type, answers.framework);
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
    needsBuild: entryPoints.needsBuild,
    moduleEntry: entryPoints.module,
    typesEntry: entryPoints.types,
    canonicalVersion: packageVersion(),
    ruleset: getRuleset(answers.type, answers.framework),
    framework: answers.framework,
    withStorybook: answers.withStorybook,
    withCli: answers.withCli,
  };
}
