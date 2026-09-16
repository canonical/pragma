/**
 * No part speaks English of its own. Every story of the package renders with
 * every message of the record replaced by a token naming it, and nothing the
 * page shows or names — a text node, an accessible name, a value text —
 * carries a word or a phrase of the English record, outside the story's own
 * data. A string a part hard-coded, rather than read from the record, would
 * still be English here.
 *
 * The record is replaced where every part resolves it, so no story is
 * rewritten to pass `messages`: the swap goes through the same merge the
 * root's `messages` goes through. Stories render as a reader first sees
 * them, their play functions not run, since those assert the English words.
 *
 * Deviation: this mocks another package's entry point — the `bindings` module
 * every part resolves its words through — which is not this repo's habit. It
 * is what lets every story stand as written: the alternative is passing a
 * replacement to each of them, which would test the stories' own wiring
 * rather than the parts'. The mock delegates to the real module for
 * everything else.
 */

import type { DataViewsMessages } from "@canonical/dataviews-core";
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import preview from "../../../.storybook/preview.js";
import findEnglish from "../../../testing/findEnglish.js";
import serveMockApi from "../../../testing/serveMockApi.js";
import * as tableStories from "../../lib/_work_in_progress/DataTable/DataTable.stories.js";
import * as actionsStories from "../../lib/_work_in_progress/DataViews/common/Actions/Actions.stories.js";
import * as filtersStories from "../../lib/_work_in_progress/DataViews/common/Filters/Filters.stories.js";
import * as paginationStories from "../../lib/_work_in_progress/DataViews/common/Pagination/Pagination.stories.js";
import * as savedViewsStories from "../../lib/_work_in_progress/DataViews/common/SavedViews/SavedViews.stories.js";
import * as searchStories from "../../lib/_work_in_progress/DataViews/common/Search/Search.stories.js";
import * as settingsStories from "../../lib/_work_in_progress/DataViews/common/Settings/Settings.stories.js";
import * as sortPanelStories from "../../lib/_work_in_progress/DataViews/common/SortPanel/SortPanel.stories.js";
import * as graphqlStories from "../../lib/_work_in_progress/DataViews/DataViews.graphql.stories.js";
import * as restStories from "../../lib/_work_in_progress/DataViews/DataViews.rest.stories.js";
import * as compositionStories from "../../lib/_work_in_progress/DataViews/DataViews.stories.js";
import * as barStories from "../../lib/_work_in_progress/PaginationBar/PaginationBar.stories.js";
import * as switchStories from "../../lib/_work_in_progress/RendererSwitch/RendererSwitch.stories.js";
import {
  createGraphQLHandlers,
  createRestHandlers,
} from "../../storybook/machines/api/index.js";

vi.mock("@canonical/dataviews-core/bindings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@canonical/dataviews-core/bindings")>();
  // Imported here, not above: this factory is hoisted over the file's
  // imports, so nothing the file imported is built yet. The factory runs once
  // for the module registry, so the replacement is built once.
  const { default: createTokenMessages } = await import(
    "../../../testing/createTokenMessages.js"
  );
  const replaced = createTokenMessages(actual.resolveMessages());
  return {
    ...actual,
    resolveMessages: (messages: Partial<DataViewsMessages> = {}) =>
      actual.resolveMessages({ ...replaced, ...messages }),
  };
});

setProjectAnnotations([preview]);

// jsdom has no service worker, so the server-backed stories are answered by
// msw/node over the same handlers.
serveMockApi([...createRestHandlers(), ...createGraphQLHandlers()]);

/** Every story of the package, by the part it shows. */
const parts = {
  DataTable: composeStories(tableStories),
  PaginationBar: composeStories(barStories),
  Composition: composeStories(compositionStories),
  "REST API": composeStories(restStories),
  "GraphQL API": composeStories(graphqlStories),
  Actions: composeStories(actionsStories),
  Filters: composeStories(filtersStories),
  Pagination: composeStories(paginationStories),
  SavedViews: composeStories(savedViewsStories),
  Search: composeStories(searchStories),
  Settings: composeStories(settingsStories),
  SortPanel: composeStories(sortPanelStories),
  RendererSwitch: composeStories(switchStories),
};

/**
 * The text a story writes itself, which the library does not say: the name
 * a composition gives its search, the actions the action bar's stories
 * place in it, and what one of them counts in its own indicator.
 */
const AUTHORED_ANYWHERE: readonly string[] = ["Search machines"];

/** What one part's stories write themselves, beside the text every story may. */
const AUTHORED: Readonly<Record<string, readonly string[]>> = {
  Actions: ["Delete", "machines selected"],
  // The name a switch's story gives its own collection, which says the
  // record's "Show" without being its word.
  RendererSwitch: ["Show machines as"],
};

/** List every phrase a part's stories author, the shared ones included. */
const listAuthoredIn = (part: string): ReadonlySet<string> =>
  new Set([...AUTHORED_ANYWHERE, ...(AUTHORED[part] ?? [])]);

/** The English record, from the module every part's words were replaced in. */
const readEnglish = async (): Promise<DataViewsMessages> => {
  const actual = await vi.importActual<
    typeof import("@canonical/dataviews-core/bindings")
  >("@canonical/dataviews-core/bindings");
  return actual.resolveMessages();
};

afterEach(() => {
  cleanup();
});

describe("stories speak only the messages", () => {
  it("replaces every message, so a word left in a story is a part's own", async () => {
    const bindings = await import("@canonical/dataviews-core/bindings");
    const english = await readEnglish();
    for (const [key, message] of Object.entries(bindings.resolveMessages())) {
      expect(message).not.toBe(english[key as keyof DataViewsMessages]);
    }
  });

  for (const [part, stories] of Object.entries(parts)) {
    for (const [name, Story] of Object.entries(stories)) {
      it(`${part} ${name}`, async () => {
        const english = await readEnglish();
        // A superseded request's failure some server-backed stories report is
        // not what this looks for.
        const errors = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
          await act(async () => {
            render(<Story />);
            await new Promise((settle) => {
              setTimeout(settle, 50);
            });
          });
          expect(
            findEnglish(document.body, english, listAuthoredIn(part)),
          ).toEqual([]);
        } finally {
          errors.mockRestore();
        }
      });
    }
  }
});
