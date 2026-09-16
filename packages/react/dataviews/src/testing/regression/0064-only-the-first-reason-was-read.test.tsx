/**
 * Regression: every reason an ordering was refused for is read.
 *
 * Before the fix a header took the first refusal its source gave and said
 * that alone, so a reader heard one reason, worked around it, and met the
 * next only at the following attempt. A source refuses one ordering for as
 * many reasons as it has — its declaration cannot state them all — and
 * every one is said together, as a refused filter reports its own.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
];

/** Two reasons one ordering is refused for, which no declaration states. */
const REASONS = [
  "this endpoint orders only what it has indexed",
  "an ordering cannot be applied to a filtered set here",
] as const;

const SAID = `Sort unchanged: ${REASONS[0]}; ${REASONS[1]}.`;

describe("regression 0064 — only the first reason was read", () => {
  it("says every reason one ordering was refused for, in one announcement", async () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      // The declaration refuses nothing: the source answers for itself.
      capabilities: declareMachineOrdering(2),
      refusals: (query) =>
        query.slice.sort.length === 0
          ? []
          : [
              {
                part: "sort",
                code: "too-many-terms",
                field: null,
                operator: null,
                reason: REASONS[0],
              },
              {
                part: "sort",
                code: "too-many-terms",
                field: null,
                operator: null,
                reason: REASONS[1],
              },
            ],
    });
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Name" }));

    expect((await readAnnouncements()).at(-1)).toBe(SAID);
    // The header shows every reason too, not the first alone.
    expect(
      screen
        .getByRole("button", { name: "Name" })
        .closest("[role='columnheader']")
        ?.querySelector(".sort-reason")?.textContent,
    ).toBe(SAID);
  });
});
