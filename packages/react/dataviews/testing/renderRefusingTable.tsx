import { fireEvent, render, screen } from "@testing-library/react";
import { DataTable } from "../src/lib/_work_in_progress/DataTable/index.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  type MachineProvider,
  machine,
} from "./machines.js";

/**
 * Render a table over a source ordering by at most one term, with Name
 * already sorted, so a Shift-activated Status is refused. Answers the
 * provider, Status's sort button as first rendered — a node a remount of
 * the column leaves detached, so no test clicks it after hiding the
 * column — and a finder for the reason region of whichever Status header
 * is mounted now.
 *
 * @note Impure: renders into the document and sorts the provider by Name.
 */
export default function renderRefusingTable(): {
  readonly provider: MachineProvider;
  readonly status: HTMLElement;
  readonly findReason: () => Element | null;
} {
  const { provider } = createMachineProvider({
    rows: [machine("m-1", "alpha")],
    capabilities: declareMachineOrdering(1),
  });
  render(
    <DataTable
      provider={provider}
      columns={[
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status", sortable: true },
      ]}
      label="Machines"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Name" }));
  const status = screen.getByRole("button", { name: "Status" });
  // Looked up afresh each time: hiding and showing the column remounts its
  // header, and a node held from before would still read the old text.
  const findReason = (): Element | null =>
    screen
      .getByRole("button", { name: "Status" })
      .closest("[role='columnheader']")
      ?.querySelector(".sort-reason") ?? null;
  return { provider, status, findReason };
}
