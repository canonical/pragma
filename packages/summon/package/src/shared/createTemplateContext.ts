import { componentLayerFor, isSubTierLayer } from "@canonical/summon-core";
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

  const componentLayer = componentLayerFor(answers.name);

  return {
    componentLayer,
    // Only a sub-tier package declares its own layer. The five second-level
    // tiers are already named in the styles package's order statement, and a
    // second statement naming one of them again could only reorder it.
    declaresComponentLayer: isSubTierLayer(componentLayer),
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
