/**
 * The server-backed stories behave as their play functions say, run against
 * the same mock endpoints Storybook serves them: each story runs through its
 * own loaders, decorators and args, the handlers are the only thing
 * answering its requests, and a request nothing answers fails the story.
 */

import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { screen, within } from "@testing-library/react";
import { afterAll, describe, expect, it } from "vitest";
import preview from "../../../.storybook/preview.js";
import serveMockApi from "../../../testing/serveMockApi.js";
import * as graphqlStories from "../../lib/_work_in_progress/DataViews/DataViews.graphql.stories.js";
import * as restStories from "../../lib/_work_in_progress/DataViews/DataViews.rest.stories.js";
import {
  createGraphQLHandlers,
  createRestHandlers,
} from "../../storybook/machines/api/index.js";
import { SERVER_BACKED_PARTS } from "../../storybook/machines/constants.js";

// The package's own preview, as Storybook applies it. Setting it also brings
// Storybook's core annotations, which bind each play function's `canvas`.
setProjectAnnotations([preview]);

// jsdom has no service worker, so the stories' loaders start none: msw/node
// answers the same handlers here instead.
serveMockApi([...createRestHandlers(), ...createGraphQLHandlers()]);

/** Each story file's composed stories, by the endpoint they reach. */
const endpoints = {
  "REST API": composeStories(restStories),
  "GraphQL API": composeStories(graphqlStories),
};

describe("server-backed stories behave", () => {
  for (const [endpoint, stories] of Object.entries(endpoints)) {
    for (const [name, Story] of Object.entries(stories)) {
      it(`${endpoint} ${name}`, async () => {
        await Story.run();
      });
    }
  }

  // The "Show code" panel spells these parts; the screen must be what it says.
  it("renders the parts its composition text names", async () => {
    const { searchLabel, tableLabel, labels, sizes } = SERVER_BACKED_PARTS;
    await endpoints["REST API"].Answered.run();
    expect(screen.getByLabelText(searchLabel)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: tableLabel })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: labels.status }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(`${labels.cores} from`)).toBeInTheDocument();
    expect(
      screen.getByLabelText(`${labels.name} contains`),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(`${labels.region} contains`),
    ).toBeInTheDocument();
    const pageSizes = within(screen.getByLabelText("Items per page:"));
    for (const size of sizes) {
      expect(
        pageSizes.getByRole("option", { name: String(size) }),
      ).toBeInTheDocument();
    }
    // Only this endpoint looks through the owner, so only it names its input.
    await endpoints["GraphQL API"].Answered.run();
    expect(
      screen.getByLabelText(`${labels.owner} contains`),
    ).toBeInTheDocument();
  });

  // A story's run removes the one before it; the last is removed by no later
  // one.
  afterAll(() => {
    document.body.innerHTML = "";
  });
});
