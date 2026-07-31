/**
 * The published configuration reference agrees with the validator a config
 * actually hits.
 *
 * Two independently produced artifacts: `docs/reference/config.md` is rendered
 * from an exhaustive `Record<keyof RawConfig, …>` (so `tsc` pins its row set to
 * the TYPE), while `rawConfigSchema` is hand-written zod. `parseRawConfig`
 * casts its result `as RawConfig`, so nothing else compares the two — a field
 * the type declares and zod strips, or one zod accepts and the page never
 * mentions, would be invisible.
 *
 * The page is parsed exactly as a reader would read it: the `Field` column of
 * its `## Fields` table. Zod lives here already, so no new import crosses a
 * boundary.
 */

import { describe, expect, it } from "vitest";
import { emitReference } from "../spec/emitReference.js";
import { rawConfigSchema } from "./schema.js";

/** The `field` cells of the generated page's Fields table, in page order. */
function readDocumentedFields(): string[] {
  const page = emitReference([]).get("config.md") ?? "";
  return [...page.matchAll(/^\| `([a-zA-Z]+)` \| /gm)].map((row) => row.at(1));
}

describe("the configuration reference agrees with the validator", () => {
  it("documents exactly the fields the validator accepts", () => {
    expect(readDocumentedFields().sort()).toEqual(
      Object.keys(rawConfigSchema.shape).sort(),
    );
  });

  it("marks a field optional iff the validator lets a layer omit it", () => {
    // Every layer field is optional — a layer declares only what it overrides,
    // which is what makes per-field provenance possible. Stated as a derived
    // correspondence rather than a constant so a required field added later
    // fails here instead of quietly contradicting the page.
    const page = emitReference([]).get("config.md") ?? "";
    for (const [field, schema] of Object.entries(rawConfigSchema.shape)) {
      const row = page
        .split("\n")
        .find((line) => line.startsWith(`| \`${field}\` |`));
      expect(row, `no row for \`${field}\``).toBeDefined();
      expect(row?.includes("(optional)"), `\`${field}\` optionality`).toBe(
        schema.safeParse(undefined).success,
      );
    }
  });
});
