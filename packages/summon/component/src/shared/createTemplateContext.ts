/**
 * Template context creation for component generators
 */

import { getComponentName, kebabCase } from "./string-helpers/index.js";
import type { BaseComponentAnswers, TemplateContext } from "./types.js";

/**
 * Create template context from answers
 */
export default function createTemplateContext(
  answers: BaseComponentAnswers,
): TemplateContext {
  const name = getComponentName(answers.componentPath);
  return {
    name,
    kebabName: kebabCase(name),
    withStyles: answers.withStyles,
    withStories: answers.withStories,
    withSsrTests: answers.withSsrTests,
  };
}
