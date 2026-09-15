import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import {
  createMockApiLoader,
  createRestHandlers,
} from "../../../storybook/machines/api/index.js";
import {
  SERVER_BACKED_COLUMNS_CODE,
  SERVER_BACKED_FACETS,
  SERVER_BACKED_RENDER_CODE,
} from "../../../storybook/machines/constants.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import readPaginationSummary from "../../../storybook/machines/readPaginationSummary.js";
import ServerBackedMachines from "../../../storybook/machines/ServerBackedMachines.js";
import { createRestMachineSource } from "../../../storybook/machines/sources/index.js";
import Component from "./Provider.js";

const meta = {
  title: "_work_in_progress/DataViews/REST API",
  component: Component,
  decorators: [withAppScope],
  argTypes: {
    provider: { control: false },
  },
  // Every scenario at once, each under its own path: a story reaches the one
  // its source addresses, and the docs page renders them all together. Each
  // answer waits a moment, so the pending state is seen between them.
  loaders: [createMockApiLoader(createRestHandlers({ latency: 300 }))],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

/** The consumer code every story here shows: the endpoint through TanStack Query. */
const code = consumerCode({
  parts: ["DataViews", "type DataTableColumn"],
  core: [
    "createPage",
    "createQuerySource",
    "declareCapabilities",
    "encodeQuery",
  ],
  imports: `import { QueryClient, QueryObserver } from "@tanstack/query-core";
import { machineCollection } from "./machines.js";`,
  declarations: `${SERVER_BACKED_COLUMNS_CODE}

const queryClient = new QueryClient();
// Mounted, so its queries refetch when the window regains focus or the
// network reconnects.
queryClient.mount();

// What the endpoint runs: the parts offer this and nothing else.
const capabilities = declareCapabilities(machineCollection, {
  filter: {
    status: ["isAny", "isNone"],
    cores: ["gte", "lte"],
    name: ["contains", "startsWith"],
    region: ["contains", "startsWith"],
  },
  search: ["name", "owner"],
  sort: {
    fields: ["name", "status", "cores", "region", "owner"],
    terms: 1,
    tiebreak: "opaque",
  },
  counts: { pageable: "exact", matched: "exact", total: "exact" },
  facets: ["status", "cores"],
});

/** Whether a value is a count, of a kind the envelope names. */
const isCount = (count) =>
  count?.kind === "unknown" ||
  ((count?.kind === "exact" || count?.kind === "at-least") &&
    typeof count.value === "number");

/** Whether a value is one value of a values facet, with its count. */
const isFacetValue = (entry) =>
  (typeof entry?.value === "string" ||
    typeof entry?.value === "number" ||
    entry?.value === true) &&
  isCount(entry.count);

/** Whether a value is one end of a range facet. */
const isRangeEnd = (end) =>
  end === null || typeof end === "string" || typeof end === "number";

/**
 * The facets an answer carries, read rather than trusted: a range with two
 * ends, or values each with a count, and anything else left out.
 */
const readAnsweredFacets = (answered) => {
  if (typeof answered !== "object" || answered === null) {
    return undefined;
  }
  const facets = {};
  for (const [field, facet] of Object.entries(answered)) {
    if (
      facet?.kind === "range" &&
      isRangeEnd(facet.min) &&
      isRangeEnd(facet.max)
    ) {
      facets[field] = { kind: "range", min: facet.min, max: facet.max };
    } else if (facet?.kind === "values" && Array.isArray(facet.values)) {
      facets[field] = {
        kind: "values",
        values: facet.values.filter(isFacetValue),
      };
    }
  }
  return facets;
};

const source = createQuerySource({
  capabilities,
  queryKey: ["machines"],
  fetchPage: async ({ slice, window, facets }) => {
    const params = encodeQuery({
      schema: machineCollection.schema,
      slice,
      window,
    });
    // The endpoint computes a facet for each field named.
    for (const field of facets) {
      params.append("facet", field);
    }
    const response = await fetch(\`/api/machines?\${params}\`);
    // Read the answer, never trust it: a field of another shape is absent.
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      // A failure's message is what the table shows beside the rows.
      throw new Error(
        typeof body?.reason === "string"
          ? body.reason
          : response.statusText || \`the endpoint answered \${response.status}\`,
      );
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("the endpoint answered without a JSON object");
    }
    if (!Array.isArray(body.items)) {
      throw new Error("the endpoint answered without machines");
    }
    return createPage({
      rows: body.items,
      matched: typeof body.matched === "number" ? body.matched : undefined,
      total: typeof body.total === "number" ? body.total : undefined,
      facets: readAnsweredFacets(body.facets),
    });
  },
  createObserver: (query) => new QueryObserver(queryClient, query),
});`,
  source: "source",
  query: "page=1&size=5",
  facets: SERVER_BACKED_FACETS,
  render: SERVER_BACKED_RENDER_CODE,
});

/**
 * A REST endpoint through TanStack Query: every search, filter, ordering and
 * page is a request to the endpoint, which answers one page and counts
 * exactly. The query reaches it spelled as the URL grammar spells it.
 */
export const Answered: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createRestMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "failed" }));
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–3 out of 3 items",
      ),
    );
  },
};

/** A request the endpoint has not answered: the table says it is loading, and claims no count. */
export const Loading: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines
      source={() => createRestMachineSource("unanswered")}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Loading…")).toBeVisible();
    // Still loading a moment later, with nothing failed: the request went to
    // the endpoint that never answers, not one that answered or refused it.
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    await expect(canvas.getByText("Loading…")).toBeVisible();
    await expect(canvas.queryByText(/could not be loaded/)).toBeNull();
  },
};

/** An endpoint that fails every request: the reason it gives stands in place of the rows. */
export const Failed: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createRestMachineSource("down")} />
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "These rows could not be loaded: the machine inventory is unavailable",
      ),
    ).toBeVisible();
  },
};

/**
 * The next page fails: the rows already on screen stay, marked as no longer
 * answering the query, under the reason the endpoint gives.
 */
export const FailedOverKeptRows: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines
      source={() => createRestMachineSource("first-page-only")}
    />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }));
    await expect(
      await canvas.findByText(
        /These rows do not match the current query: the machines past the first page are unavailable/,
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("table")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(
      canvas.getByRole("row", { name: /alder\.example\.com/ }),
    ).toBeVisible();
  },
};

/**
 * The endpoint orders by one term. A second term, Shift-added from a header,
 * is refused before any request is sent, and that header says why.
 */
export const SortLimitedToOneTerm: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createRestMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    // One user holds Shift through the click, as a person would: separate
    // calls share no modifier state.
    const user = userEvent.setup();
    await user.click(canvas.getByRole("button", { name: "Host" }));
    await user.keyboard("{Shift>}");
    await user.click(canvas.getByRole("button", { name: "Status" }));
    await user.keyboard("{/Shift}");
    const status = canvas.getByRole("columnheader", { name: "Status" });
    await expect(within(status).getByText(/^Sort unchanged/)).toHaveTextContent(
      "Sort unchanged: this source orders by at most 1 term.",
    );
    await expect(
      canvas.getByRole("columnheader", { name: "Host" }),
    ).toHaveAttribute("aria-sort", "ascending");
  },
};

/**
 * Text a host must contain, typed into the filters: each edit is a request
 * the endpoint answers case-insensitively and literally, so `ELM` finds
 * `elm.example.com`. The owner has no text input: the endpoint cannot look
 * through it, and says so by leaving it out of what it declares. Before any
 * script runs the input is a GET form control named `name__contains`, and a
 * submission reaches the same query.
 */
export const TextApplied: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createRestMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    const host = canvas.getByRole("textbox", { name: "Host contains" });
    await expect(host).toHaveAttribute("name", "name__contains");
    await expect(
      canvas.queryByRole("textbox", { name: "Owner contains" }),
    ).toBeNull();
    await userEvent.type(host, "ELM");
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing item 1 out of 1",
      ),
    );
    await expect(
      canvas.getByRole("row", { name: /elm\.example\.com/ }),
    ).toBeVisible();
    await expect(host).toHaveFocus();
    await expect(host).toHaveAttribute("name", "name__contains");
  },
};

/**
 * Counts beside the statuses, from the endpoint's facets: each is how many
 * machines matching the query hold that status, counted over every page.
 * Keeping the failed machines leaves the other statuses' counts where they
 * were, since a field's own restriction is lifted from its own facet; moving
 * the set to none-of keeps every machine that is not failed instead.
 */
export const CountsAndNoneOf: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createRestMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    const status = canvas.getByRole("group", { name: "Status is any of" });
    await waitFor(() =>
      expect(
        within(status).getByRole("checkbox", { name: "failed" }),
      ).toHaveAccessibleDescription("3"),
    );
    await userEvent.click(
      within(status).getByRole("checkbox", { name: "failed" }),
    );
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–3 out of 3 items",
      ),
    );
    await expect(
      within(status).getByRole("checkbox", { name: "running" }),
    ).toHaveAccessibleDescription("6");
    await userEvent.click(
      canvas.getByRole("button", { name: "Match none of these instead" }),
    );
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 9 items",
      ),
    );
    const excluded = canvas.getByRole("group", { name: "Status is none of" });
    await expect(
      within(excluded).getByRole("checkbox", { name: "failed" }),
    ).toBeChecked();
  },
};

/**
 * Text a host name starts with: `B` keeps `birch.example.com` alone, where
 * text it contains would keep every host holding a `b`. Before any script
 * runs the input is a GET form control named `name__startsWith`.
 */
export const StartsWithApplied: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createRestMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    const host = canvas.getByRole("textbox", { name: "Host starts with" });
    await expect(host).toHaveAttribute("name", "name__startsWith");
    await expect(
      canvas.queryByRole("textbox", { name: "Owner starts with" }),
    ).toBeNull();
    await userEvent.type(host, "B");
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing item 1 out of 1",
      ),
    );
    await expect(
      canvas.getByRole("row", { name: /birch\.example\.com/ }),
    ).toBeVisible();
  },
};
