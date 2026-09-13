import {
  createLocationBinding,
  createMemoryLocation,
  DEFAULT_WINDOW,
} from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { consumerCode } from "../../storybook/machines/consumerCode.js";
import {
  hostName,
  type MachineProvider,
  useMachineProvider,
  withAppScope,
} from "../../storybook/machines/story-utils.js";
import type { DataTableColumn } from "../DataTable/index.js";
import useDataViewsValue from "./hooks/useDataViewsValue.js";
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
      <Component.Filters labels={{ status: "Status", cores: "Cores" }} />
      {children}
      <Component.DataTable
        columns={columns}
        label="Machines"
        selectable
        rowLabel={hostName}
      />
      <Component.Actions />
      <Component.Pagination sizes={[5, 10, 25]} />
    </Component>
  );
}

const selectTwo = (provider: MachineProvider): void => {
  provider.selection.add(["m-02", "m-06"]);
};

/**
 * The connected parts: one root, and every part reading it. The filters edit
 * the query, the table shows the rows that answer it, the action bar acts on
 * the selection, and the pagination bar pages the window. None of them takes
 * a copy of the query, the window or the selection.
 */
export const ConnectedParts: Story = {
  parameters: consumerCode({
    parts: ["DataViews", "type DataTableColumn"],
    declarations: columnsCode,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    prepare: `provider.selection.add(["m-02", "m-06"]);`,
    render: `<DataViews provider={provider}>
  <DataViews.Filters labels={{ status: "Status", cores: "Cores" }} />
  <DataViews.DataTable
    columns={columns}
    label="Machines"
    selectable
    rowLabel={(row) => String(row.name)}
  />
  <DataViews.Actions />
  <DataViews.Pagination sizes={[5, 10, 25]} />
</DataViews>`,
  }),
  render: function Render() {
    const provider = useMachineProvider({
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
      prepare: selectTwo,
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
  },
};

/** The query the location carries, shown the way an address bar would. */
function QueryInTheLocation({
  provider,
}: {
  readonly provider: MachineProvider;
}): ReactElement {
  // A memory location stands in for the browser's here, so the story never
  // rewrites the page's own address.
  const [location] = useState(() =>
    createMemoryLocation({ href: "/machines?status=failed" }),
  );
  const binding = useMemo(
    () => createLocationBinding({ host: provider, location }),
    [provider, location],
  );
  useEffect(() => binding.observe(), [binding]);
  const [query, setQuery] = useState(() => location.read().toString());
  useEffect(
    () =>
      location.subscribe(() => {
        setQuery(location.read().toString());
      }),
    [location],
  );
  const issues = useDataViewsValue(binding.issues);
  return (
    <p>
      <output aria-label="Location">{`/machines?${query}`}</output>
      {issues.length === 0 ? null : ` — ${issues.length} refused`}
    </p>
  );
}

/**
 * The query in the URL: the location arrived carrying `status=failed`, so
 * the provider adopted it, and running machines were then added in the
 * filters, which wrote the query back to the location. A link carrying a
 * clause the source refuses stays in the URL with its reasons on
 * `binding.issues`.
 */
export const QueryInTheUrl: Story = {
  parameters: {
    docs: {
      source: {
        language: "tsx",
        code: `import {
  createLocationBinding,
  createPlatformLocation,
  type DataViewsProvider,
  type PlatformLocation,
} from "@canonical/dataviews-core";
import { useDataViewsValue } from "@canonical/dataviews-react";
import { machineSchema } from "./machines.js";

type MachinesProvider = DataViewsProvider<typeof machineSchema.fields>;

// Render beside the parts, inside the root, with the provider the
// collection's root mounts and your router's platform surface.
export function MachinesUrlQuery({
  provider,
  platform,
}: {
  provider: MachinesProvider;
  platform: PlatformLocation;
}) {
  // Building the binding subscribes to nothing; observing does, so it
  // happens in an effect and a discarded render leaves nothing behind.
  const binding = useMemo(
    () =>
      createLocationBinding({
        host: provider,
        location: createPlatformLocation(platform),
      }),
    [provider, platform],
  );
  useEffect(() => binding.observe(), [binding]);
  const issues = useDataViewsValue(binding.issues);
  return issues.length === 0 ? null : (
    <ul className="query-issues">
      {issues.map((issue, index) => (
        // One parameter can be refused for several reasons.
        <li key={\`\${index}:\${issue.parameter}\`}>{issue.reason}</li>
      ))}
    </ul>
  );
}`,
      },
    },
  },
  render: function Render() {
    const provider = useMachineProvider({
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
    });
    return (
      <Collection provider={provider}>
        <QueryInTheLocation provider={provider} />
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
