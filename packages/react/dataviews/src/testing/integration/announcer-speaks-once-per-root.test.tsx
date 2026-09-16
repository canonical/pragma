/**
 * One announcer per root, speaking for the root that commanded: a root has
 * one polite region however many tables it places, a standalone table has
 * its own, and a second root over the same provider says nothing of the
 * first root's commands, so a shared change is never said twice. Every
 * outcome is worded by the root's messages — the ordering a sort applied,
 * each term by the heading showing it, and what orders the rows once the
 * reader states nothing.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
];

/** A provider over one machine, ordering by up to two terms. */
const createProvider = (
  defaultSort: Parameters<typeof declareMachineOrdering>[1] = [],
) =>
  createMachineProvider({
    rows: [machine("m-1", "alpha")],
    capabilities: declareMachineOrdering(2, defaultSort),
  }).provider;

// What is said in one moment, and what is said in the next, is time this
// file decides rather than waits out.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Every announcer region in the document. */
const listRegions = () => document.querySelectorAll(".ds.data-views-announcer");

/** What the regions inside one element have said, oldest first. */
const listSaidIn = (element: Element): readonly string[] =>
  Array.from(
    element.querySelectorAll(".ds.data-views-announcer > *"),
    (announcement) => announcement.textContent ?? "",
  );

describe("the announcer speaks once per root", () => {
  it("gives a root one region, however many tables it places, and a standalone table its own", () => {
    const provider = createProvider();
    render(
      <>
        <DataViews provider={provider}>
          <DataViews.DataTable columns={columns} label="First" />
          <DataViews.DataTable columns={columns} label="Second" />
          <DataViews.Pagination />
        </DataViews>
        <DataTable provider={provider} columns={columns} label="Alone" />
      </>,
    );
    expect(listRegions()).toHaveLength(2);
  });

  it("says a sort in the root that commanded it, and nothing in a second root over the provider", async () => {
    const provider = createProvider();
    render(
      <>
        <section aria-label="First root">
          <DataViews provider={provider}>
            <DataViews.DataTable columns={columns} label="First" />
          </DataViews>
        </section>
        <section aria-label="Second root">
          <DataViews provider={provider}>
            <DataViews.DataTable columns={columns} label="Second" />
          </DataViews>
        </section>
      </>,
    );
    const first = screen.getByRole("region", { name: "First root" });
    const second = screen.getByRole("region", { name: "Second root" });
    fireEvent.click(within(first).getByRole("button", { name: "Name" }));
    await readAnnouncements();
    expect(listSaidIn(first)).toEqual(["Sorted by Name, ascending."]);
    expect(listSaidIn(second)).toEqual([]);
    // Both tables show the shared ordering; only one said it.
    expect(
      within(second).getByRole("columnheader", { name: "Name" }),
    ).toHaveAttribute("aria-sort", "ascending");
  });

  it("says a column hidden once, in the root that hid it, though both roots' tables lose it", async () => {
    const provider = createProvider();
    render(
      <>
        <section aria-label="First root">
          <DataViews provider={provider}>
            <DataViews.DataTable columns={columns} label="First" />
          </DataViews>
        </section>
        <section aria-label="Second root">
          <DataViews provider={provider}>
            <DataViews.DataTable columns={columns} label="Second" />
          </DataViews>
        </section>
      </>,
    );
    const first = screen.getByRole("region", { name: "First root" });
    const second = screen.getByRole("region", { name: "Second root" });
    fireEvent.click(
      within(first).getByRole("button", { name: "Column options for Status" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide column" }));
    expect(await readAnnouncements()).toEqual(["Status hidden"]);
    expect(listSaidIn(first)).toEqual(["Status hidden"]);
    expect(
      within(second).queryByRole("columnheader", { name: "Status" }),
    ).toBeNull();
  });

  it("leaves one region after StrictMode's rehearsal mount, speaking once", async () => {
    const provider = createProvider();
    render(
      <StrictMode>
        <DataViews provider={provider}>
          <DataViews.DataTable columns={columns} label="Machines" />
        </DataViews>
      </StrictMode>,
    );
    expect(listRegions()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(await readAnnouncements()).toEqual(["Sorted by Name, ascending."]);
  });

  it("renders the root's region on a server, empty, once", () => {
    const provider = createProvider();
    const html = renderToString(
      <DataViews provider={provider}>
        <DataViews.DataTable columns={columns} label="Machines" />
      </DataViews>,
    );
    expect(html.match(/class="ds data-views-announcer"/g)).toHaveLength(1);
    expect(html).toContain(
      '<div class="ds data-views-announcer" aria-live="polite" aria-relevant="additions"></div>',
    );
  });

  it("says each term of a further ordering, each by the heading showing it", async () => {
    const provider = createProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    fireEvent.click(screen.getByRole("button", { name: "Status" }), {
      shiftKey: true,
    });
    // Said in one moment, spoken as one announcement: the ordering as it
    // stands, not as it passed through.
    expect(await readAnnouncements()).toEqual([
      "Sorted by Name, ascending; then Status, ascending.",
    ]);
  });

  it("says the source's own order once the reader states nothing, by a field no column shows", async () => {
    const provider = createProvider([{ field: "cores", direction: "desc" }]);
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    for (const _press of [1, 2, 3]) {
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      await readAnnouncements();
    }
    expect((await readAnnouncements()).at(-1)).toBe(
      "Sorted by the source's own order: cores, descending.",
    );
  });

  it("says that nothing orders the rows where the source documents no order", async () => {
    const provider = createProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    for (const _press of [1, 2, 3]) {
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      await readAnnouncements();
    }
    expect((await readAnnouncements()).at(-1)).toBe(
      "Not sorted: the source documents no order.",
    );
  });

  it("speaks a heading drawn as an element as it is drawn", async () => {
    const provider = createProvider();
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name" },
          {
            id: "status",
            header: <abbr title="Status">St</abbr>,
          },
        ]}
        label="Machines"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Column options for St" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide column" }));
    expect(await readAnnouncements()).toEqual(["St hidden"]);
    expect(
      document.querySelector(".ds.data-views-announcer abbr"),
    ).toHaveAttribute("title", "Status");
  });

  it("words what it says in the root's messages", async () => {
    const provider = createProvider();
    render(
      <DataViews
        provider={provider}
        messages={{
          sortApplied: (terms) =>
            `Trié par ${terms.map((term) => term.name).join(", ")}`,
        }}
      >
        <DataViews.DataTable columns={columns} label="Machines" />
      </DataViews>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(await readAnnouncements()).toEqual(["Trié par Name"]);
  });
});
