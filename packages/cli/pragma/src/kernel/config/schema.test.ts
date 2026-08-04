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
import { DETAIL_LEVELS } from "../../constants.js";
import { emitReference } from "../spec/emitReference.js";
import { parseRawConfig, rawConfigSchema } from "./schema.js";

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

describe("`detail` is validated against the levels the page publishes", () => {
  it("accepts each published level", () => {
    for (const level of DETAIL_LEVELS) {
      expect(parseRawConfig({ detail: level }, "x.config.ts").detail).toBe(
        level,
      );
    }
  });

  it("rejects an unpublished level, naming the file and every valid one", () => {
    // The failure mode this replaces was SILENT: `z.string()` took anything,
    // `config show` reported the bogus value as `[project]`, and the renderer
    // fell back to `standard`. The message is asserted against the three levels
    // and the file because those are what a user needs to fix it — and they are
    // what zod's default enum message plus `parseRawConfig`'s wrapper compose.
    let thrown: unknown;
    try {
      parseRawConfig({ detail: "banana" }, "pragma.config.ts");
    } catch (error) {
      thrown = error;
    }
    expect((thrown as { code?: string })?.code).toBe("CONFIG_ERROR");
    const message = (thrown as { message: string }).message;
    expect(message).toContain("pragma.config.ts");
    expect(message).toContain("detail");
    for (const level of DETAIL_LEVELS) expect(message).toContain(level);
  });
});
