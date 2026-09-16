import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The scoped table's own source, where its stylesheet is asked for. */
const source = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "ScopedDataTable.tsx",
  ),
  "utf8",
);

describe("ScopedDataTable stylesheet", () => {
  it("asks for the table's stylesheet itself, so a connected table is styled", () => {
    // The standalone table imports the sheet too, but a connected table is
    // rendered by the root and never passes through that module: dropping
    // this import would leave every connected table unstyled, which no
    // rendering test would notice, since jsdom loads no stylesheets.
    expect(source).toContain('import "../../styles.css";');
  });
});
