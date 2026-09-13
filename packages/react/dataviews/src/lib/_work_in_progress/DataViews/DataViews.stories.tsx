import {
  createMemoryLocation,
  DEFAULT_WINDOW,
  type QueryLocation,
  type ViewDraft,
} from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import { machineCollection } from "../../../storybook/machines/fixtures.js";
import {
  type MachineProvider,
  useMachineProvider,
  useStoryViewStore,
} from "../../../storybook/machines/story-utils.js";
import type { DataTableColumn } from "../DataTable/index.js";
import { useDataViews, useDataViewsValue } from "./hooks/index.js";
import Component from "./Provider.js";

const meta = {
  title: "_work_in_progress/DataViews/Composition",
  component: Component,
  decorators: [withAppScope],
  argTypes: {
    provider: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

const columnsCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];`;

/**
 * The parameters the location carried that the provider refused — a clause
 * the grammar, the schema or the source cannot run. Reads the root, like
 * any child of one; empty without a location.
 */
function QueryIssues(): ReactElement | null {
  const { issues } = useDataViews(machineCollection);
  const refused = useDataViewsValue(issues);
  return refused.length === 0 ? null : (
    <ul className="query-issues">
      {refused.map((issue) => (
        // One parameter can be refused for several reasons.
        <li key={`${issue.parameter}:${issue.reason}`}>{issue.reason}</li>
      ))}
    </ul>
  );
}

const queryIssuesCode = `// Refused parameters of the URL: a clause the grammar, the collection or the
// source cannot run stays in the URL, and its reasons are the provider's.
function QueryIssues() {
  const { issues } = useDataViews(machineCollection);
  const refused = useDataViewsValue(issues);
  return refused.length === 0 ? null : (
    <ul className="query-issues">
      {refused.map((issue) => (
        // One parameter can be refused for several reasons.
        <li key={\`\${issue.parameter}:\${issue.reason}\`}>{issue.reason}</li>
      ))}
    </ul>
  );
}`;

/** The pagination bar's summary: the filters hold status regions of their own. */
const summary = (canvas: ReturnType<typeof within>): HTMLElement =>
  within(canvas.getByRole("navigation", { name: "Pagination" })).getByRole(
    "status",
  );

/** The root and its parts over one provider, as an application lays them out. */
function Collection({
  provider,
  children,
}: {
  readonly provider: MachineProvider;
  readonly children?: ReactElement | undefined;
}): ReactElement {
  return (
    <Component provider={provider}>
      {provider.views === null ? null : <Component.Views />}
      <Component.Filters labels={{ status: "Status", cores: "Cores" }} />
      <QueryIssues />
      {children}
      <Component.DataTable
        columns={columns}
        label="Machines"
        selectable
        // The connected table's records are the widest shape; a typed
        // label goes through the standalone table, or a cell's collection.
        rowLabel={(row) => String(row["name"])}
      />
      <Component.Actions />
      <Component.Pagination sizes={[5, 10, 25]} />
    </Component>
  );
}

const selectTwo = (provider: MachineProvider): void => {
  provider.selection.add(["m-02", "m-06"]);
};

/** A saved view the screen's store opens with. */
const failedMachines: ViewDraft = {
  id: "failed-machines",
  name: "Failed machines",
  query: "as=table&status=failed",
};

/**
 * The whole screen: one provider over a source, a location and a store of
 * saved views, and every part reading it. The views open a query, the
 * filters edit it, the table shows the rows that answer it, the action bar
 * acts on the selection, and the pagination bar pages the window. None of
 * them takes a copy of the query, the window or the selection; the URL and
 * the store follow the provider, which owns both loops.
 */
export const ConnectedParts: Story = {
  parameters: consumerCode({
    parts: [
      "DataViews",
      "type DataTableColumn",
      "useDataViews",
      "useDataViewsValue",
    ],
    core: ["createPlatformLocation"],
    imports: `import { machineCollection, machines } from "./machines.js";
import { platform } from "./router.js";`,
    declarations: `${columnsCode}

${queryIssuesCode}`,
    location: "createPlatformLocation(platform)",
    views: true,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    render: `<DataViews provider={provider}>
  <DataViews.Views />
  <DataViews.Filters labels={{ status: "Status", cores: "Cores" }} />
  <QueryIssues />
  <DataViews.DataTable
    columns={columns}
    label="Machines"
    selectable
    rowLabel={(row) => String(row["name"])}
  />
  <DataViews.Actions />
  <DataViews.Pagination sizes={[5, 10, 25]} />
</DataViews>`,
  }),
  render: function Render() {
    // A memory location and a story's own store stand in for the browser's
    // here, so the story never rewrites the page's own address or its views.
    const [location] = useState(() =>
      createMemoryLocation({ href: "/machines" }),
    );
    const { store } = useStoryViewStore({ seed: [failedMachines] });
    const provider = useMachineProvider({
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
      prepare: selectTwo,
      location,
      views: store,
    });
    return <Collection provider={provider} />;
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(summary(canvas)).toHaveTextContent("Showing 1–5 out of 12 items"),
    );
    await expect(
      canvas.getByRole("group", { name: "Selection actions" }),
    ).toHaveTextContent("2 selected");
    await expect(
      canvas.getByRole("group", { name: "Saved views" }),
    ).toBeVisible();
  },
};

/** The query the location carries, shown the way an address bar would. */
function QueryInTheLocation({
  location,
}: {
  readonly location: QueryLocation;
}): ReactElement {
  const query = useSyncExternalStore(location.subscribe, () =>
    location.read().toString(),
  );
  return (
    <p>
      <output aria-label="Location">{`/machines?${query}`}</output>
    </p>
  );
}

/**
 * The query in the URL: the location arrived carrying `status=failed`, so
 * the provider adopted it, and running machines were then added in the
 * filters, which wrote the query back to the location. A link carrying a
 * clause the source refuses stays in the URL with its reasons on the
 * provider's `issues`.
 */
export const QueryInTheUrl: Story = {
  parameters: consumerCode({
    parts: [
      "DataViews",
      "type DataTableColumn",
      "useDataViews",
      "useDataViewsValue",
    ],
    core: ["createPlatformLocation"],
    imports: `import { machineCollection, machines } from "./machines.js";
import { platform } from "./router.js";`,
    declarations: `${columnsCode}

${queryIssuesCode}`,
    // The router's platform surface: anything with getLocation, navigate
    // and subscribe. The provider adopts the query it carries and writes
    // every edit back.
    location: "createPlatformLocation(platform)",
    render: `<DataViews provider={provider}>
  <DataViews.Filters labels={{ status: "Status", cores: "Cores" }} />
  <QueryIssues />
  <DataViews.DataTable
    columns={columns}
    label="Machines"
    selectable
    rowLabel={(row) => String(row["name"])}
  />
  <DataViews.Actions />
  <DataViews.Pagination sizes={[5, 10, 25]} />
</DataViews>`,
  }),
  render: function Render() {
    // A memory location stands in for the browser's here, so the story
    // never rewrites the page's own address.
    const [location] = useState(() =>
      createMemoryLocation({ href: "/machines?status=failed" }),
    );
    const provider = useMachineProvider({
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
      location,
    });
    return (
      <Collection provider={provider}>
        <QueryInTheLocation location={location} />
      </Collection>
    );
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("checkbox", { name: "failed" })).toBeChecked(),
    );
    await waitFor(() =>
      expect(summary(canvas)).toHaveTextContent("Showing 1–3 out of 3 items"),
    );
    // An edit the filters make is written back to the location.
    await userEvent.click(canvas.getByRole("checkbox", { name: "running" }));
    await waitFor(() =>
      expect(canvas.getByLabelText("Location")).toHaveTextContent(
        /status=failed.*status=running|status=running.*status=failed/,
      ),
    );
    await waitFor(() =>
      // The location carried no page size, so the default page holds all
      // nine.
      expect(summary(canvas)).toHaveTextContent("Showing 1–9 out of 9 items"),
    );
  },
};
