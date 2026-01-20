/**
 * Template context creation for component generators
 */

import { getComponentName, kebabCase } from "./string-helpers.js";
import type {
  BaseComponentAnswers,
  Framework,
  TemplateContext,
} from "./types.js";

/**
 * Create template context from answers
 */
export const createTemplateContext = (
  answers: BaseComponentAnswers,
  framework: Framework,
): TemplateContext => {
  const name = getComponentName(answers.componentPath);
  return {
    name,
    kebabName: kebabCase(name),
    generatorName: `@canonical/summon:component-${framework}`,
    version: "0.1.0",
    withStyles: answers.withStyles,
    withStories: answers.withStories,
    withSsrTests: answers.withSsrTests,
  };
};
