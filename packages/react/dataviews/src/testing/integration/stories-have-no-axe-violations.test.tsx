/**
 * Every DataTable, sort panel and server-backed story has no axe violation:
 * the automated half of the evidence the Storybook accessibility addon shows
 * in its panel, run with the package's tests so a story that gains a
 * violation fails `test` rather than waiting for someone to open the panel.
 * Each story renders through its own decorators and args. A table or panel
 * story is checked as a reader first sees it; a server-backed story once its
 * play function has run, in the state that leaves — the failure beside the
 * rows, the refusal beside the header, the text applied with its clear
 * control — answered by the mock endpoints it declares.
 *
 * Necessary evidence, not a conformance claim: jsdom lays nothing out, so
 * contrast is left to a browser, and axe checks what markup can prove.
 */

import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { render } from "@testing-library/react";
import { afterAll, describe, it } from "vitest";
import preview from "../../../.storybook/preview.js";
import expectNoAxeViolations from "../../../testing/expectNoAxeViolations.js";
import serveMockApi from "../../../testing/serveMockApi.js";
import * as tableStories from "../../lib/_work_in_progress/DataTable/DataTable.stories.js";
import * as panelStories from "../../lib/_work_in_progress/DataViews/common/SortPanel/SortPanel.stories.js";
import * as graphqlStories from "../../lib/_work_in_progress/DataViews/DataViews.graphql.stories.js";
import * as restStories from "../../lib/_work_in_progress/DataViews/DataViews.rest.stories.js";
import {
  createGraphQLHandlers,
  createRestHandlers,
} from "../../storybook/machines/api/index.js";

// The package's own preview, as Storybook applies it, so every story here
// renders with the parameters and annotations it has in Storybook.
setProjectAnnotations([preview]);

// jsdom has no service worker, so the stories' loaders start none: msw/node
// answers the same handlers here instead.
serveMockApi([...createRestHandlers(), ...createGraphQLHandlers()]);

/** The stories checked as first rendered, by the part they show. */
const rendered = {
  DataTable: composeStories(tableStories),
  SortPanel: composeStories(panelStories),
};

/** The stories checked once their play function has run, by endpoint. */
const played = {
  "REST API": composeStories(restStories),
  "GraphQL API": composeStories(graphqlStories),
};

describe("stories have no axe violations", () => {
  for (const [part, stories] of Object.entries(rendered)) {
    for (const [name, Story] of Object.entries(stories)) {
      it(`${part} ${name}`, async () => {
        const { container } = render(<Story />);
        await expectNoAxeViolations(container);
      });
    }
  }

  for (const [part, stories] of Object.entries(played)) {
    for (const [name, Story] of Object.entries(stories)) {
      it(`${part} ${name}`, async () => {
        // A story's run removes the one before it; its own markup is in the
        // page until the next.
        await Story.run();
        await expectNoAxeViolations(document.body);
      });
    }
  }

  // The last story run is removed by no later one.
  afterAll(() => {
    document.body.innerHTML = "";
  });
});
