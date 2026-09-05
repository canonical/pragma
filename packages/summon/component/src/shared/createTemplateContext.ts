/**
 * Template context creation for component generators
 */

import resolveComponentLayer from "./resolveComponentLayer.js";
import { getComponentName, kebabCase } from "./string-helpers/index.js";
import type { BaseComponentAnswers, TemplateContext } from "./types.js";

/**
 * Create template context from answers. `withSsrTests` is optional so
 * generators that do not offer SSR tests (lit) can pass their honest answer
 * shape; the context defaults it to false.
 *
 * `componentLayer` is not an answer: an author cannot be expected to know
 * which cascade layer the package they are scaffolding into belongs to, and a
 * wrong one is silent. It is read from the target package instead.
 *
 * @note Impure — resolveComponentLayer reads the working directory.
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
    componentLayer: resolveComponentLayer(),
  };
}
