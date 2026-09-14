/**
 * Regression: a reader on a header's link keeps focus as scripts take over.
 *
 * Before the fix, the server's link to the next ordering was replaced by a
 * button once the table hydrated, and a reader who had tabbed to the link
 * in the meantime was left with focus on nothing.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { act, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0009 — a header link's focus lost on hydration", () => {
  it("hands the link's focus to the button that replaces it", async () => {
    const location = createMemoryLocation({ href: "/machines" });
    const build = () =>
      createMachineProvider({
        rows: [machine("m-1", "alpha")],
        location,
        capabilities: declareMachineOrdering(3),
      }).provider;
    const buildTable = (provider: ReturnType<typeof build>) => (
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", sortable: true }]}
        label="Machines"
      />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(buildTable(build()));
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const link = container.querySelector("a.sort");
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error("the server rendered no sort link");
    }
    link.focus();
    const root = await act(async () =>
      hydrateRoot(container, buildTable(build())),
    );
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
    });
    expect(document.activeElement).toBe(
      within(container).getByRole("button", { name: "Name" }),
    );
  });
});
