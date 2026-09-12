import type {
  ActionCapabilities,
  RowRecord,
  SourceBinding,
} from "@canonical/dataviews-core";
import {
  createArraySource,
  createDataViewsProvider,
  createSourceBinding,
  DEFAULT_WINDOW,
} from "@canonical/dataviews-core";
import type { ButtonProps } from "@canonical/react-ds-global";
import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { consumerCode } from "../../../../storybook/machines/consumerCode.js";
import type { MachineFields } from "../../../../storybook/machines/fixtures.js";
import {
  machineSchema,
  machines,
} from "../../../../storybook/machines/fixtures.js";
import type { MachineProvider } from "../../../../storybook/machines/story-utils.js";
import {
  hostName,
  withAppScope,
} from "../../../../storybook/machines/story-utils.js";
import DataTable from "../../../DataTable/DataTable.js";
import type { DataTableColumn } from "../../../DataTable/types.js";
import useDataViews from "../../hooks/useDataViews.js";
import DataViews from "../../Provider.js";
import Pagination from "../Pagination/Pagination.js";
import Component from "./Actions.js";

const meta = {
  title: "_work_in_progress/DataViews/Actions",
  component: Component,
  decorators: [withAppScope],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "owner", header: "Owner" },
];

/**
 * One action over the selection: it reads the selection when pressed and
 * runs through the source binding, which captures those targets and removes
 * the ones that succeed from the selection.
 */
function SelectionAction({
  provider,
  binding,
  action,
  ...button
}: Omit<ButtonProps, "onClick"> & {
  readonly provider: MachineProvider;
  readonly binding: SourceBinding | null;
  readonly action: string;
}): ReactElement {
  const { selection } = useDataViews(provider);
  return (
    <Button
      {...button}
      type="button"
      importance="tertiary"
      disabled={binding === null}
      onClick={() => {
        void binding?.runAction({
          action,
          targets: { kind: "explicit", ids: [...selection.state.get().ids] },
          payload: null,
        });
      }}
    />
  );
}

/**
 * The machines over a source that can archive and delete them, five to a
 * page, with the table, the action bar and the pagination bar.
 */
function ManagedMachines({
  select = [],
  indicator,
}: {
  readonly select?: readonly string[];
  readonly indicator?: (provider: MachineProvider) => ReactNode;
}): ReactElement {
  const [source] = useState(() => {
    let remaining: readonly RowRecord[] = machines;
    const overAnyRows: ActionCapabilities = {
      targets: "explicit",
      limit: null,
    };
    const managed = createArraySource({
      rows: remaining,
      fields: ["name", "status", "region", "cores", "owner"],
      actions: { archive: overAnyRows, delete: overAnyRows },
      // Both actions take the machines out of the collection.
      runAction: async ({ targets }) => {
        const ids = targets.kind === "explicit" ? targets.ids : [];
        remaining = remaining.filter((row) => !ids.includes(String(row.id)));
        managed.setRows(remaining);
        return ids.map((target) => ({
          target,
          status: "succeeded" as const,
        }));
      },
    });
    return managed;
  });
  const [provider] = useState(() =>
    createDataViewsProvider<MachineFields>({
      schema: machineSchema,
      capabilities: source.capabilities,
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
    }),
  );
  const [initial] = useState(select);
  const [binding, setBinding] = useState<SourceBinding | null>(null);
  useEffect(() => {
    const bound = createSourceBinding({ host: provider, source });
    const release = bound.observe();
    setBinding(bound);
    provider.selection.add(initial);
    if (provider.state.get().result.status === "idle") {
      provider.refresh();
    }
    return () => {
      release();
      setBinding(null);
    };
  }, [provider, source, initial]);
  return (
    <DataViews provider={provider}>
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        selectable
        rowLabel={hostName}
      />
      <Component indicator={indicator?.(provider)}>
        <SelectionAction provider={provider} binding={binding} action="archive">
          Archive
        </SelectionAction>
        <SelectionAction
          provider={provider}
          binding={binding}
          action="delete"
          anticipation="destructive"
          icon="delete"
        >
          Delete
        </SelectionAction>
      </Component>
      <Pagination sizes={[5, 10]} />
    </DataViews>
  );
}

const selectionActionCode = `type MachinesProvider = DataViewsProvider<typeof machineSchema.fields>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "owner", header: "Owner" },
];

// Reads the selection when pressed; the binding captures those targets,
// runs the source's action and removes the ones that succeed.
function SelectionAction({
  provider,
  binding,
  action,
  ...button
}: Omit<ButtonProps, "onClick"> & {
  provider: MachinesProvider;
  binding: SourceBinding | null;
  action: string;
}) {
  const { selection } = useDataViews(provider);
  return (
    <Button
      {...button}
      type="button"
      importance="tertiary"
      disabled={binding === null}
      onClick={() => {
        void binding?.runAction({
          action,
          targets: { kind: "explicit", ids: [...selection.state.get().ids] },
          payload: null,
        });
      }}
    />
  );
}`;

/** A story's consumer code: the collection, its action bar and its actions. */
const actionsCode = ({
  prepare,
  indicator = "",
  declarations = "",
  hooks = [],
}: {
  readonly prepare?: string;
  readonly indicator?: string;
  readonly declarations?: string;
  readonly hooks?: readonly string[];
} = {}) =>
  consumerCode({
    parts: ["DataTable", "DataViews", "type DataTableColumn", "useDataViews"],
    coreTypes: ["DataViewsProvider"],
    imports: `import { Button, type ButtonProps } from "@canonical/react-ds-global";
import { archiveMachines, machineSchema, machines } from "./machines.js";`,
    hooks,
    declarations: `${selectionActionCode}${declarations}`,
    source: `createArraySource({
      rows: machines,
      fields: ["name", "status", "region", "cores", "owner"],
      // What each operation may address; nothing else can be run.
      actions: {
        archive: { targets: "explicit", limit: null },
        delete: { targets: "explicit", limit: null },
      },
      // Resolves with one outcome per target: { target, status }.
      runAction: ({ action, targets }) => archiveMachines(action, targets),
    })`,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    prepare,
    keepsBinding: true,
    render: `<DataViews provider={provider}>
  <DataTable
    provider={provider}
    columns={columns}
    label="Machines"
    selectable
    rowLabel={(row) => String(row.name)}
  />
  <DataViews.Actions${indicator}>
    <SelectionAction provider={provider} binding={binding} action="archive">
      Archive
    </SelectionAction>
    <SelectionAction
      provider={provider}
      binding={binding}
      action="delete"
      anticipation="destructive"
      icon="delete"
    >
      Delete
    </SelectionAction>
  </DataViews.Actions>
  <DataViews.Pagination sizes={[5, 10]} />
</DataViews>`,
  });

const selectTwo = `provider.selection.add(["m-02", "m-06"]);`;

/**
 * Nothing selected: the table and the pagination bar, and no action bar. It
 * appears with the first selection.
 */
export const NothingSelected: Story = {
  parameters: actionsCode(),
  render: () => <ManagedMachines />,
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    await expect(canvas.queryByRole("group")).toBeNull();
  },
};

/**
 * Two selected: the bar counts them, offers the actions placed in it — a
 * destructive one in the Button's destructive colour — and a deselect named
 * with what it clears. It renders on the design system's contrasted surface.
 */
export const TwoSelected: Story = {
  parameters: actionsCode({ prepare: selectTwo }),
  render: () => <ManagedMachines select={["m-02", "m-06"]} />,
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole("group", { name: "Selection actions" });
    await expect(bar).toHaveTextContent("2 selected");
    await expect(
      canvas.getByRole("button", { name: "Deselect 2 items" }),
    ).toBeEnabled();
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Archive" })).toBeEnabled(),
    );
  },
};

/**
 * Selected across pages: birch is on this page and ironwood on the second.
 * The count is the whole selection, not the rows on screen.
 */
export const SelectedAcrossPages: Story = {
  parameters: actionsCode({
    prepare: `provider.selection.add(["m-02", "m-09"]);`,
  }),
  render: () => <ManagedMachines select={["m-02", "m-09"]} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Select birch.example.com" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("group", { name: "Selection actions" }),
    ).toHaveTextContent("2 selected");
  },
};

/** A count that names what is selected, following the selection. */
function MachinesSelected({
  provider,
}: {
  readonly provider: MachineProvider;
}): ReactElement {
  const { selection } = useDataViews(provider);
  const read = () => selection.state.get().ids.size;
  const count = useSyncExternalStore(selection.state.subscribe, read, read);
  return (
    <span role="status" className="indicator">
      {`${count} ${count === 1 ? "machine" : "machines"} selected`}
    </span>
  );
}

const machinesSelectedCode = `

// Follows the selection, and announces it as the default count does.
function MachinesSelected({ provider }: { provider: MachinesProvider }) {
  const { selection } = useDataViews(provider);
  const read = () => selection.state.get().ids.size;
  const count = useSyncExternalStore(selection.state.subscribe, read, read);
  return (
    <span role="status" className="indicator">
      {\`\${count} \${count === 1 ? "machine" : "machines"} selected\`}
    </span>
  );
}`;

/**
 * A caller's indicator: a count that names what is selected. It reads the
 * selection itself, and announces it as the default count does. When the
 * persistent selection panel ships, its trigger takes this place.
 */
export const CustomIndicator: Story = {
  parameters: actionsCode({
    prepare: selectTwo,
    indicator: " indicator={<MachinesSelected provider={provider} />}",
    declarations: machinesSelectedCode,
    hooks: ["useSyncExternalStore"],
  }),
  render: () => (
    <ManagedMachines
      select={["m-02", "m-06"]}
      indicator={(provider) => <MachinesSelected provider={provider} />}
    />
  ),
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole("group", {
      name: "Selection actions",
    });
    await expect(within(bar).getByRole("status")).toHaveTextContent(
      "2 machines selected",
    );
  },
};

/**
 * Archived: two machines were selected and Archive was pressed. The source
 * archived both, they left the collection and the selection, and with nothing
 * left selected the bar went with them. Ten machines remain.
 */
export const Archived: Story = {
  parameters: actionsCode({ prepare: selectTwo }),
  render: () => <ManagedMachines select={["m-02", "m-06"]} />,
  play: async ({ canvas }) => {
    const archive = await canvas.findByRole("button", { name: "Archive" });
    await waitFor(() => expect(archive).toBeEnabled());
    await userEvent.click(archive);
    await waitFor(() => expect(canvas.queryByRole("group")).toBeNull());
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–5 out of 10 items",
      ),
    );
  },
};
