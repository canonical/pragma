/**
 * The windowed stylesheet's contract with the markup: the table it styles
 * is the one a windowed body renders, and it declares what the range needs
 * of its viewport. jsdom applies no CSS, so the declarations are read.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataTable from "../../../DataTable/DataTable.js";
import virtualRows from "../../virtualRows.js";

const sheet = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "styles.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("windowed DataTable stylesheet", () => {
  it("styles the table a windowed body renders", () => {
    const provider = createDataViewsProvider({
      schema: createSchema([{ field: "owner", kind: "flag" }]),
    });
    const { container } = render(
      <DataTable
        provider={provider}
        label="Machines"
        columns={[{ id: "name", header: "Name" }]}
        windowing={virtualRows({ estimatedRowHeight: 32 })}
      />,
    );
    const selector = sheet.match(/\.ds\.data-table:has\(> ([^)]+)\)/)?.[1];
    expect(selector).toBe(".ds.data-table-row-group.body.windowed");
    expect(
      container.querySelector(`.ds.data-table > ${selector}`),
    ).not.toBeNull();
  });

  it("makes the table its own bounded viewport, anchored by the range", () => {
    expect(sheet).toMatch(/position:\s*relative;/);
    expect(sheet).toMatch(/overflow-anchor:\s*none;/);
    expect(sheet).toMatch(/max-block-size:\s*100svh;/);
  });
});
