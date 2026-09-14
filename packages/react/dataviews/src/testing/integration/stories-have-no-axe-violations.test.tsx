/**
 * Every DataTable and sort panel story, rendered as a reader first sees it,
 * has no axe violation: the automated half of the evidence the Storybook
 * accessibility addon shows in its panel, run with the package's tests so a
 * story that gains a violation fails `test` rather than waiting for someone
 * to open the panel. Each story renders through its own decorators and args.
 *
 * Necessary evidence, not a conformance claim: jsdom lays nothing out, so
 * contrast is left to a browser, and axe checks what markup can prove.
 */

import { composeStories } from "@storybook/react-vite";
import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import expectNoAxeViolations from "../../../testing/expectNoAxeViolations.js";
import * as tableStories from "../../lib/_work_in_progress/DataTable/DataTable.stories.js";
import * as panelStories from "../../lib/_work_in_progress/DataViews/common/SortPanel/SortPanel.stories.js";

/** Each story file's composed stories, by the part it shows. */
const parts = {
  DataTable: composeStories(tableStories),
  SortPanel: composeStories(panelStories),
};

describe("stories have no axe violations", () => {
  for (const [part, stories] of Object.entries(parts)) {
    for (const [name, Story] of Object.entries(stories)) {
      it(`${part} ${name}`, async () => {
        const { container } = render(<Story />);
        await expectNoAxeViolations(container);
      });
    }
  }
});
