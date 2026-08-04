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

describe("the removed `completion.caseSensitive` fails loudly", () => {
  it("names the file and the field a config still setting it must delete", () => {
    // Unknown keys are STRIPPED for forward compatibility, so removing the
    // field from the schema alone would let a config that sets it succeed —
    // and succeeding silently is exactly what the field did while it was
    // validated and read by nothing. The pre-validation check makes the removal
    // audible, on the `packages` rename's precedent.
    let thrown: unknown;
    try {
      parseRawConfig({ completion: { caseSensitive: true } }, "x.config.ts");
    } catch (error) {
      thrown = error;
    }
    expect((thrown as { code?: string })?.code).toBe("CONFIG_ERROR");
    expect((thrown as { message: string })?.message).toContain("x.config.ts");
    expect((thrown as { message: string })?.message).toContain(
      "completion.caseSensitive",
    );
    expect(
      (thrown as { recovery?: { message?: string } })?.recovery?.message,
    ).toContain("caseSensitive");
  });

  it("still accepts the two `completion` fields something reads", () => {
    expect(
      parseRawConfig(
        { completion: { minChars: 2, families: { block: false } } },
        "x.config.ts",
      ).completion,
    ).toEqual({ minChars: 2, families: { block: false } });
  });

  it("does NOT trip on a declared story's autocomplete heuristic", () => {
    // The detection is shallow and exact for a measured reason: `stories` and
    // `packs[].stories` are opaque to this schema, and the pack grammar's
    // AutocompleteHeuristic carries its OWN, live `caseSensitive`
    // (`spec/validate.ts` → `completion/model.ts`). A deep scan would reject a
    // perfectly valid declared story at config load — every command, `doctor`
    // and `sources update` included. The `packages` rename is pinned the same
    // way in `readConfig.test.ts`; this is that pin, inverted.
    const story = {
      noun: "dish",
      lookup: {
        by: "ex:name",
        complete: { kind: "names", caseSensitive: true },
      },
    };
    expect(parseRawConfig({ stories: [story] }, "x.config.ts").stories).toEqual(
      [story],
    );
    expect(
      parseRawConfig(
        { packs: [{ name: "@acme/p", stories: [story] }] },
        "x.config.ts",
      ).packs,
    ).toEqual([{ name: "@acme/p", stories: [story] }]);
  });
});

describe("the pre-v2 `colophon` byline fails with the edit that fixes it", () => {
  it("names the file and the new shape, not just the type mismatch", () => {
    // The third break of the same class, and the one that nearly shipped
    // without the treatment the other two got. zod DOES reject a string here,
    // so nothing vanished — but it rejected it with "Expected object, received
    // string" and `recovery: undefined`, which names the field and neither the
    // new shape nor the fix. Measured, and the reason this check exists beside
    // the other two rather than being left to the validator.
    let thrown: unknown;
    try {
      parseRawConfig({ colophon: "a byline" }, "x.config.ts");
    } catch (error) {
      thrown = error;
    }
    expect((thrown as { code?: string })?.code).toBe("CONFIG_ERROR");
    const message = (thrown as { message: string })?.message;
    expect(message).toContain("x.config.ts");
    expect(message).toContain("colophon");
    const recovery = (thrown as { recovery?: { message?: string } })?.recovery
      ?.message;
    expect(recovery).toContain("markdown");
    expect(recovery).toContain("summary");
  });

  it("accepts the declaration shape, summary and all", () => {
    expect(
      parseRawConfig(
        { colophon: { markdown: "# body", summary: "short" } },
        "x.config.ts",
      ).colophon,
    ).toEqual({ markdown: "# body", summary: "short" });
    expect(
      parseRawConfig({ colophon: { markdown: "body" } }, "x.config.ts")
        .colophon,
    ).toEqual({ markdown: "body" });
  });
});
