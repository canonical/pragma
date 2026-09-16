import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import {
  createMockApiLoader,
  createRestHandlers,
} from "../../../storybook/machines/api/index.js";
import { SERVER_BACKED_FACETS } from "../../../storybook/machines/constants.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import { createPendingSource } from "../../../storybook/machines/fixtures.js";
import { createRestMachineSource } from "../../../storybook/machines/sources/index.js";
import {
  type MachineProviderConfig,
  useMachineProvider,
} from "../../../storybook/machines/story-utils.js";
import { FacetRangeChart as ConnectedChart } from "../DataViews/common/FacetRangeChart/index.js";
import { DataViews } from "../DataViews/index.js";
import Component from "./FacetRangeChart.js";

const meta = {
  title: "_work_in_progress/FacetRangeChart",
  component: Component,
  decorators: [withAppScope],
  args: {
    field: "cores",
    label: "Cores",
  },
  argTypes: {
    provider: { control: false },
    renderStatus: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

/** The chart over a provider bound to the story's own source. */
function MachineChart({
  field,
  label,
  options,
}: {
  readonly field: string;
  readonly label: string;
  readonly options?: MachineProviderConfig | undefined;
}): ReactElement {
  const provider = useMachineProvider({ facets: ["cores"], ...options });
  return <Component provider={provider} field={field} label={label} />;
}

/**
 * Cores range: the fewest and the most cores any machine the query matches
 * holds, measured by the source, drawn as a band on an axis that starts at
 * the field's declared minimum. Both values are in the table that follows.
 */
export const CoresRange: Story = {
  render: ({ field, label }) => <MachineChart field={field} label={label} />,
  parameters: consumerCode({
    // A prototype: nothing of it is exported from the package root to name.
    parts: [],
    imports: `import { machineCollection, machines } from "./machines.js";
// A work-in-progress prototype: not yet exported from the package root.
import { FacetRangeChart } from "./FacetRangeChart.js";`,
    facets: ["cores"],
    render: `<FacetRangeChart provider={provider} field="cores" label="Cores" />`,
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", {
        name: "Cores: a range chart from 2 to 64",
      }),
    ).toBeVisible();
  },
};

/** The range beside the filters, over one root. */
function BesideFiltersMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({ facets: ["status", "cores"] });
  return (
    <DataViews provider={provider}>
      <DataViews.Filters />
      <ConnectedChart field="cores" label={label} />
    </DataViews>
  );
}

/**
 * Beside the filters: keeping only the failed machines narrows the range to
 * the cores those machines hold, since the source measures it over every
 * machine the query matches.
 */
export const BesideFilters: Story = {
  render: ({ label }) => <BesideFiltersMachines label={label} />,
  parameters: consumerCode({
    parts: ["DataViews"],
    imports: `import { machineCollection, machines } from "./machines.js";
// A work-in-progress prototype: not yet exported from the package root.
import { FacetRangeChart } from "./DataViews/FacetRangeChart.js";`,
    facets: ["status", "cores"],
    render: `<DataViews provider={provider}>
  <DataViews.Filters />
  <FacetRangeChart field="cores" label="Cores" />
</DataViews>`,
  }),
  play: async ({ canvas }) => {
    await canvas.findByRole("img", {
      name: "Cores: a range chart from 2 to 64",
    });
    await userEvent.click(canvas.getByRole("checkbox", { name: /^failed/ }));
    await waitFor(() =>
      expect(
        canvas.getByRole("img", { name: "Cores: a range chart from 2 to 8" }),
      ).toBeVisible(),
    );
  },
};

/** Loading: the source has not answered, so the chart says so and draws nothing. */
export const Loading: Story = {
  render: ({ field, label }) => (
    <MachineChart
      field={field}
      label={label}
      options={{ source: createPendingSource }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Loading…")).toBeVisible();
  },
};

/** The range over the REST endpoint, which measures it. */
function RestBackedMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({
    source: () => createRestMachineSource("live"),
    facets: SERVER_BACKED_FACETS,
  });
  return (
    <DataViews provider={provider}>
      <ConnectedChart field="cores" label={label} />
    </DataViews>
  );
}

/**
 * REST-backed: the same range over a REST endpoint reached through TanStack
 * Query, which measures the cores over every machine it matches.
 */
export const RestBacked: Story = {
  loaders: [createMockApiLoader(createRestHandlers({ latency: 300 }))],
  render: ({ label }) => <RestBackedMachines label={label} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole(
        "img",
        { name: "Cores: a range chart from 2 to 64" },
        { timeout: 3000 },
      ),
    ).toBeVisible();
  },
};
