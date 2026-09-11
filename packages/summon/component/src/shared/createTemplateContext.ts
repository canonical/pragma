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
 * `componentLayer` is not an answer: the package being generated into states
 * the layer its stylesheets belong in, and an author cannot be expected to
 * repeat it correctly at every prompt. Where the package states none, the
 * stylesheet is generated without a layer wrapper.
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
    componentLayer: resolveComponentLayer().componentLayer,
  };
}
