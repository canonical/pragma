/**
 * Template context creation for component generators
 */

import { getComponentName, kebabCase } from "./string-helpers/index.js";
import type { BaseComponentAnswers, TemplateContext } from "./types.js";

/**
 * Create template context from answers. `withSsrTests` is optional so
 * generators that do not offer SSR tests (lit) can pass their honest answer
 * shape; the context defaults it to false.
 */
export default function createTemplateContext(
  answers: Omit<BaseComponentAnswers, "withSsrTests"> &
    Partial<Pick<BaseComponentAnswers, "withSsrTests">>,
): TemplateContext {
  const name = getComponentName(answers.componentPath);
  return {
    name,
    kebabName: kebabCase(name),
    withStyles: answers.withStyles,
    withStories: answers.withStories,
    withSsrTests: answers.withSsrTests ?? false,
  };
}
