import { createMemoryLocation } from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import {
  createGraphQLHandlers,
  createMockApiLoader,
} from "../../../storybook/machines/api/index.js";
import {
  SERVER_BACKED_COLUMNS_CODE,
  SERVER_BACKED_RENDER_CODE,
} from "../../../storybook/machines/constants.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import readPaginationSummary from "../../../storybook/machines/readPaginationSummary.js";
import ServerBackedMachines from "../../../storybook/machines/ServerBackedMachines.js";
import { createGraphQLMachineSource } from "../../../storybook/machines/sources/index.js";
import Component from "./Provider.js";

const meta = {
  title: "_work_in_progress/DataViews/GraphQL API",
  component: Component,
  decorators: [withAppScope],
  argTypes: {
    provider: { control: false },
  },
  // Every scenario at once, each under its own path: a story reaches the one
  // its source addresses, and the docs page renders them all together. Each
  // answer waits a moment, so the pending state is seen between them.
  loaders: [createMockApiLoader(createGraphQLHandlers({ latency: 300 }))],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

/** The consumer code every story here shows: the endpoint through Relay. */
const code = consumerCode({
  parts: ["DataViews", "type DataTableColumn"],
  core: ["createRelaySource", "declareCapabilities", "readSlice"],
  imports: `import { createOperationDescriptor } from "relay-runtime";
import MachinesQuery from "./__generated__/MachinesQuery.graphql.js";
import { machineCollection } from "./machines.js";
import { environment } from "./relay.js";`,
  declarations: `${SERVER_BACKED_COLUMNS_CODE}

// What the endpoint runs: the parts offer this and nothing else.
const capabilities = declareCapabilities(machineCollection, {
  filter: {
    status: ["eq"],
    cores: ["gte", "lte"],
    name: ["contains"],
    region: ["contains"],
    owner: ["contains"],
  },
  search: ["name", "owner"],
  sort: {
    fields: ["name", "status", "cores", "region", "owner"],
    terms: 1,
    tiebreak: "opaque",
  },
  pagination: { kind: "cursor", backward: false, durable: false },
});

const source = createRelaySource({
  capabilities,
  environment,
  operation: ({ slice, first, after }) => {
    const { filters, search, sort } = readSlice(machineCollection, slice);
    return createOperationDescriptor(MachinesQuery, {
      first,
      after,
      where: {
        status: filters.status === undefined ? null : [...filters.status],
        coresGte: filters.cores?.gte ?? null,
        coresLte: filters.cores?.lte ?? null,
        nameContains: filters.name ?? null,
        regionContains: filters.region ?? null,
        ownerContains: filters.owner ?? null,
        search,
      },
      orderBy: sort.map(({ field, direction }) => ({
        field,
        direction: direction === "asc" ? "ASC" : "DESC",
      })),
    });
  },
  connection: (data) => data.machines,
});`,
  source: "source",
  query: "page=1&size=5",
  render: SERVER_BACKED_RENDER_CODE,
});

/**
 * A GraphQL endpoint through Relay: a forward connection that pages by
 * cursor and counts nothing, so the bar says which items are on screen and
 * never out of how many, and offers the next page only while there is one.
 */
export const Answered: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createGraphQLMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 items",
      ),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }));
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 6–10 items",
      ),
    );
  },
};

/** A request the endpoint has not answered: the table says it is loading, and claims no count. */
export const Loading: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines
      source={() => createGraphQLMachineSource("unanswered")}
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
    <ServerBackedMachines source={() => createGraphQLMachineSource("down")} />
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
      source={() => createGraphQLMachineSource("first-page-only")}
    />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 items",
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
 * A link to the third page, opened fresh: a forward connection reaches a
 * page only through the one before it, so the source refuses the request
 * before sending it and says why, rather than answering another page.
 */
export const UnreachablePage: Story = {
  parameters: code,
  render: function Render() {
    const [location] = useState(() =>
      createMemoryLocation({ href: "/machines?page=3&size=5" }),
    );
    return (
      <ServerBackedMachines
        source={() => createGraphQLMachineSource("live")}
        location={location}
      />
    );
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        /a forward connection reaches page 3 only from page 2/,
      ),
    ).toBeVisible();
  },
};

/**
 * Text a host must contain, typed into the filters: each edit is a request
 * the endpoint answers case-insensitively and literally, so `ELM` finds
 * `elm.example.com`. Before any script runs the input is a GET form
 * control named `name__contains`, and a submission reaches the same query.
 */
export const TextApplied: Story = {
  parameters: code,
  render: () => (
    <ServerBackedMachines source={() => createGraphQLMachineSource("live")} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 items",
      ),
    );
    const host = canvas.getByRole("textbox", { name: "Host contains" });
    await userEvent.type(host, "ELM");
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent("Showing item 1"),
    );
    await expect(
      canvas.getByRole("row", { name: /elm\.example\.com/ }),
    ).toBeVisible();
    await expect(host).toHaveFocus();
    await expect(host).toHaveAttribute("name", "name__contains");
    // This endpoint declares `contains` on the owner, so the owner has one.
    await expect(
      canvas.getByRole("textbox", { name: "Owner contains" }),
    ).toBeVisible();
  },
};
