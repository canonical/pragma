import axe from "axe-core";
import { expect } from "vitest";

/**
 * The WCAG 2.x A and AA rules, and nothing a page-level or layout rule adds:
 * a component renders a fragment, not a page with landmarks, and jsdom lays
 * nothing out, so a contrast result here would be a guess.
 */
const RULES: axe.RunOptions = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
  },
  rules: { "color-contrast": { enabled: false } },
};

/**
 * Assert that axe finds no violation in a rendered element, naming every
 * rule it breaks and where, so a failure reads as the finding itself.
 *
 * Necessary evidence, not a conformance claim: axe checks what markup can
 * prove, and says nothing of keyboard journeys or what a screen reader
 * announces.
 */
export default async function expectNoAxeViolations(
  element: Element,
): Promise<void> {
  const results = await axe.run(element, RULES);
  expect(
    results.violations.map((violation) => ({
      rule: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}
