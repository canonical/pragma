import type { RowRecord } from "@canonical/dataviews-core";
import { DEFAULT_WINDOW } from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, waitFor } from "storybook/test";
import { consumerCode } from "../../storybook/machines/consumerCode.js";
import type { MachineFields } from "../../storybook/machines/fixtures.js";
import {
  createPendingSource,
  createUncountedSource,
} from "../../storybook/machines/fixtures.js";
import type {
  MachineProvider,
  MachineProviderConfig,
} from "../../storybook/machines/story-utils.js";
import {
  useMachineProvider,
  withAppScope,
  withScrollingFrame,
} from "../../storybook/machines/story-utils.js";
import DataTable from "../DataTable/DataTable.js";
import type { DataTableColumn } from "../DataTable/types.js";
import Component from "./PaginationBar.js";
import type { PaginationBarProps } from "./types.js";

const meta = {
  title: "_work_in_progress/PaginationBar",
  component: Component,
  decorators: [withAppScope],
  args: {
    sizes: [5, 10, 25],
  },
  argTypes: {
    provider: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "owner", header: "Owner" },
];

const columnsCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "owner", header: "Owner" },
];`;

const pageCode = `<>
  <DataTable provider={provider} columns={columns} label="Machines" />
  <PaginationBar provider={provider} sizes={[5, 10, 25]} />
</>`;

/** The machines five to a page, the table and its bar over one provider. */
function MachinesPage({
  options,
  ...args
}: Omit<PaginationBarProps<MachineFields, RowRecord>, "provider"> & {
  readonly options?: MachineProviderConfig;
}): ReactElement {
  const provider = useMachineProvider({
    window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
    ...options,
  });
  return (
    <>
      <DataTable provider={provider} columns={columns} label="Machines" />
      <Component {...args} provider={provider} />
    </>
  );
}

const renderWith =
  (options?: MachineProviderConfig): NonNullable<Story["render"]> =>
  (args) => <MachinesPage {...args} options={options} />;

const goTo =
  (page: number) =>
  (provider: MachineProvider): void => {
    provider.navigateWindow({ page });
  };

/** The canvas a story's play function queries. */
type StoryCanvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

/** Assert which of the bar's buttons may be pressed, first to last. */
const expectAvailable = async (
  canvas: StoryCanvas,
  available: readonly boolean[],
): Promise<void> => {
  const names = ["First page", "Previous page", "Next page", "Last page"];
  for (const [at, name] of names.entries()) {
    const button = canvas.getByRole("button", { name });
    await (available[at]
      ? expect(button).toBeEnabled()
      : expect(button).toBeDisabled());
  }
};

/**
 * First page: twelve machines, five to a page. The summary counts the rows on
 * screen out of the filtered total, the page select offers the three pages
 * that total makes, and there is nothing before the first page to go to.
 */
export const FirstPage: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "PaginationBar", "type DataTableColumn"],
    declarations: columnsCode,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    render: pageCode,
  }),
  render: renderWith(),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    await expect(canvas.getByText("of 3 pages")).toBeInTheDocument();
    await expectAvailable(canvas, [false, false, true, true]);
  },
};

/** A middle page: every destination is open. */
export const MiddlePage: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "PaginationBar", "type DataTableColumn"],
    declarations: columnsCode,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    prepare: "provider.navigateWindow({ page: 2 });",
    render: pageCode,
  }),
  render: renderWith({ prepare: goTo(2) }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 6–10 out of 12 items",
      ),
    );
    await expectAvailable(canvas, [true, true, true, true]);
  },
};

/**
 * Last page: two machines are left, and the summary says so. Nothing lies
 * beyond the last page, so Next and Last are unavailable.
 */
export const LastPage: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "PaginationBar", "type DataTableColumn"],
    declarations: columnsCode,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    prepare: "provider.navigateWindow({ page: 3 });",
    render: pageCode,
  }),
  render: renderWith({ prepare: goTo(3) }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 11–12 out of 12 items",
      ),
    );
    await expectAvailable(canvas, [true, true, false, false]);
  },
};

/**
 * Without a count: a source that pages without counting publishes no total,
 * so the bar invents none. The summary counts only the rows on screen, no
 * page total shows, and Last is unavailable. Next is offered while the page
 * is full, which is the only evidence there may be another.
 */
export const WithoutACount: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "PaginationBar", "type DataTableColumn"],
    imports: `import { machineSchema, machinesApi } from "./machines.js";`,
    declarations: `${columnsCode}

// A source whose capabilities declare every count as "none": each page
// arrives with no total, as from a backend that pages without counting.`,
    source: "machinesApi",
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    render: pageCode,
  }),
  render: renderWith({ source: createUncountedSource }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("Showing 1–5 items"),
    );
    await expect(canvas.queryByText(/^of /)).toBeNull();
    await expectAvailable(canvas, [false, false, true, false]);
  },
};

/**
 * Loading: the source has been asked and never answers. The bar claims no
 * count and no total it does not have, and offers no page it cannot reach.
 */
export const Loading: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "PaginationBar", "type DataTableColumn"],
    declarations: `${columnsCode}

// Rendered before the bound source has answered.`,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    render: pageCode,
  }),
  render: renderWith({ source: createPendingSource }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Loading…")).toBeInTheDocument();
    await expect(canvas.getByRole("status")).toBeEmptyDOMElement();
    await expect(
      canvas
        .getAllByRole("option", { name: "1" })
        .map((option) => option.closest("select")?.getAttribute("aria-label")),
    ).toContain("Page");
    await expect(
      canvas.getByRole("combobox", { name: "Page" }).querySelectorAll("option"),
    ).toHaveLength(1);
    await expectAvailable(canvas, [false, false, false, false]);
  },
};

/**
 * Sticky: every machine on one page, in a frame too short to show them all.
 * The frame scrolls, and the bar stays at its bottom edge over the rows
 * passing beneath it.
 */
export const StickyInAScrollingFrame: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "PaginationBar", "type DataTableColumn"],
    declarations: columnsCode,
    render: `<div style={{ maxHeight: "16rem", overflow: "auto" }}>
  <DataTable provider={provider} columns={columns} label="Machines" />
  <PaginationBar provider={provider} sizes={[5, 10, 25]} />
</div>`,
  }),
  decorators: [withScrollingFrame("16rem")],
  render: renderWith({ window: { ...DEFAULT_WINDOW, page: 1, size: 25 } }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–12 out of 12 items",
      ),
    );
    const bar = canvas.getByRole("navigation", { name: "Pagination" });
    const frame = bar.parentElement;
    if (frame === null) {
      throw new Error("expected the scrolling frame");
    }
    await expect(frame.scrollHeight).toBeGreaterThan(frame.clientHeight);
    await expect(
      Math.abs(
        bar.getBoundingClientRect().bottom -
          frame.getBoundingClientRect().bottom,
      ),
    ).toBeLessThanOrEqual(1);
  },
};
