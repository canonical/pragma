import { packageVersion } from "./packageVersion.js";
import type { MonorepoAnswers, TemplateContext } from "./types.js";

/**
 * Create template context from answers.
 */
export default function createTemplateContext(
  answers: MonorepoAnswers,
): TemplateContext {
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
    // The @canonical/* config packages release on the same fixed-version
    // train as this generator, so its own version is the correct range line.
    canonicalVersion: packageVersion(),
  };
}
