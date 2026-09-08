import getEntryPoints from "./config/getEntryPoints.js";
import getLicense from "./config/getLicense.js";
import getRuleset from "./config/getRuleset.js";
import getPackageShortName from "./getPackageShortName.js";
import { packageVersion } from "./packageVersion.js";
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
    // Both are the caller's to state. A design system's layer names, and the
    // file its order statement lives in, are that design system's business;
    // this generator copies the strings and reads nothing into them.
    componentLayer: answers.componentLayer,
    layerOrderFrom: answers.layerOrderFrom,
    shortName: getPackageShortName(answers.name),
    name: answers.name,
    description: answers.description,
    type: answers.type,
    version,
    license: getLicense(answers.type),
    needsBuild: entryPoints.needsBuild,
    canonicalVersion: packageVersion(),
    ruleset: getRuleset(answers.type, answers.withReact),
    withReact: answers.withReact,
    withStorybook: answers.withStorybook,
    withCli: answers.withCli,
  };
}
