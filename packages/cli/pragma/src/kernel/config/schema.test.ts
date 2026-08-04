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

  it("treats a declared story's payload as opaque", () => {
    // The detection is shallow and exact because of what this layer can read.
    // `stories` and `packs[].stories` are `z.array(z.unknown())` — the pack
    // grammar is `parsePackDefinition`'s to judge at dispatch, not this
    // schema's — so a deep scan would reject on ANY nested key spelled
    // `caseSensitive`, in a payload the config layer has no grammar for. That
    // takes down every command, `doctor` and `sources update` included, over a
    // key this schema was never entitled to interpret. The `packages` rename is
    // pinned the same way in `readConfig.test.ts`; this is that pin, inverted.
    //
    // The fixture is deliberately NOT a legal story: the pack grammar's
    // `lookup.completion` is `.strict()` over `enabled`/`match`/`minChars` and
    // has no `caseSensitive` at any depth (measured — `parsePackDefinition`
    // rejects both `lookup.complete` and `lookup.completion.caseSensitive` with
    // "Unrecognized key(s)"). A fixture pretending to be valid would have
    // claimed this case defends a story shape that cannot exist. What it
    // actually defends is opacity: an unknown payload passes through whatever
    // it happens to contain.
    const story = {
      noun: "dish",
      vendorExtension: { renderer: { caseSensitive: true } },
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
    // A USER layer's remedy is DELETE, not rewrite. `readConfig.ts` does not
    // `pick("colophon")`, so writing the new shape here is accepted and ignored
    // — measured on the built binary: after following a rewrite remedy in a
    // global `config.json`, `colophon --format llm` still printed the
    // distribution's own body. A remedy whose edit changes nothing is the
    // silence this check was added to end.
    const recovery = (thrown as { recovery?: { message?: string } })?.recovery
      ?.message;
    expect(recovery).toContain("delete");
    expect(recovery).not.toContain("markdown");
  });

  it("tells the DISTRIBUTION layer to write the new shape, not to delete it", () => {
    // The one layer the field is read from, so the one layer where rewriting is
    // the fix. `config/defaults.ts` is its only caller.
    let thrown: unknown;
    try {
      parseRawConfig({ colophon: "a byline" }, "conf.ts", "distribution");
    } catch (error) {
      thrown = error;
    }
    const recovery = (thrown as { recovery?: { message?: string } })?.recovery
      ?.message;
    expect(recovery).toContain("markdown");
    expect(recovery).toContain("summary");
    expect(recovery).not.toContain("delete");
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
