/**
 * Standard-noun parity pilot — the built-in `standard` read stories vs
 * the declarative pack definition in `standardParityFixtures.ts`.
 *
 * Both paths run against the real @canonical/code-standards graphs,
 * resolved from node_modules through the production loader chain — no
 * fixture TTL. Assertions demand byte parity wherever the v0 pack
 * format reaches; every remaining divergence is pinned exactly and
 * must be named in PARITY_GAPS. Nothing is cut over: the built-in
 * stories stay untouched and the pack is compiled directly.
 */

import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PARITY_GAPS, STANDARD_PACK_STORY } from "#testing";
import { parsePackageEntry } from "../../../refs/operations/parseRef.js";
import type { StandardListOutput } from "../../../standard/formatters/index.js";
import {
  standardListStory,
  standardLookupStory,
} from "../../../standard/stories.js";
import { bootStore } from "../../bootStore.js";
import compactUri from "../../compactUri.js";
import { PREFIX_MAP } from "../../prefixes.js";
import type { PragmaRuntime, StandardDetailed } from "../../types/index.js";
import type { LookupStoryView } from "../types.js";
import compilePackStories, {
  type CompiledPackStories,
} from "./compilePackStories.js";
import validateStoryPackDefinition from "./validateStoryPackDefinition.js";

const PACK_SOURCE = "standardParityFixtures";

/** The built-in CLI default view: summary lookup, no extra params. */
const SUMMARY_VIEW: LookupStoryView = {
  surface: "cli",
  detailed: false,
  params: {},
};

/** Real standard names without cs:extends — full byte parity expected. */
const PARITY_LOOKUP_NAMES = [
  "code/function/purity",
  "react/component/props",
] as const;

/** A real standard with cs:extends — pins the JSON compaction gap. */
const EXTENDS_LOOKUP_NAME = "react/component/structure/context";

/** A near-miss query — both paths must produce identical suggestions. */
const NEAR_MISS_NAME = "code/function/puriti";

let store: Store;
let rt: PragmaRuntime;
let packList: CompiledPackStories["list"];
let packLookup: NonNullable<CompiledPackStories["lookup"]>;

beforeAll(async () => {
  const boot = await bootStore({
    refs: [parsePackageEntry("@canonical/code-standards")],
  });
  store = boot.store;
  rt = { store } as PragmaRuntime;

  const compiled = compilePackStories(STANDARD_PACK_STORY, PACK_SOURCE, {
    ...PREFIX_MAP,
  });
  packList = compiled.list;
  const lookup = compiled.lookup;
  if (!lookup) {
    throw new Error("STANDARD_PACK_STORY must declare a lookup story");
  }
  packLookup = lookup;
});

afterAll(() => store.dispose());

/** Resolve one name through the built-in lookup story. */
async function lookupBuiltin(name: string): Promise<StandardDetailed> {
  const result = await standardLookupStory.resolve(rt, [name], {});
  expect(result.errors).toEqual([]);
  const entity = result.results.at(0);
  if (entity === undefined) {
    throw new Error(`built-in lookup found no result for "${name}"`);
  }
  return entity;
}

/** Resolve one name through the compiled pack lookup story. */
async function lookupPack(name: string): Promise<Record<string, string>> {
  const result = await packLookup.resolve(rt, [name], {});
  expect(result.errors).toEqual([]);
  const entity = result.results.at(0);
  if (entity === undefined) {
    throw new Error(`pack lookup found no result for "${name}"`);
  }
  return entity;
}

/**
 * Remove the built-in's URI field line — the one v0 lookup rendering
 * gap (see PARITY_GAPS: "lookup uri field"). Asserts the line occurs
 * exactly once so the transformation cannot mask other divergence.
 */
function dropUriField(text: string, marker: "  URI: " | "- URI: "): string {
  const lines = text.split("\n");
  const remaining = lines.filter((line) => !line.startsWith(marker));
  expect(lines.length - remaining.length).toBe(1);
  return remaining.join("\n");
}

/** Assert every name appears in the text, in order. */
function expectNamesInOrder(text: string, names: readonly string[]): void {
  let cursor = 0;
  for (const name of names) {
    const index = text.indexOf(name, cursor);
    expect(
      index,
      `expected "${name}" after position ${cursor}`,
    ).toBeGreaterThanOrEqual(0);
    cursor = index + name.length;
  }
}

describe("standard pack definition", () => {
  it("round-trips as declarative JSON and validates as a v0 pack", () => {
    const raw: unknown = JSON.parse(JSON.stringify(STANDARD_PACK_STORY));
    expect(validateStoryPackDefinition(raw, PACK_SOURCE)).toEqual(
      STANDARD_PACK_STORY,
    );
  });

  it("records every known gap as a distinct capability entry", () => {
    expect(PARITY_GAPS.length).toBeGreaterThan(0);
    expect(new Set(PARITY_GAPS).size).toBe(PARITY_GAPS.length);
    for (const gap of PARITY_GAPS) {
      expect(gap.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("standard list parity", () => {
  let builtinOutput: StandardListOutput;
  let packRows: Record<string, string>[];

  beforeAll(async () => {
    const resolution = await standardListStory.resolve(rt, {});
    builtinOutput = standardListStory.toOutput(resolution, {});
    packRows = await packList.resolve(rt, {});
  });

  it("resolves the same rows as the built-in resolver", () => {
    expect(packRows.length).toBeGreaterThan(0);
    expect(packRows).toEqual(builtinOutput.items);
  });

  it("json output is byte-identical", () => {
    const builtinJson = standardListStory.formatters.json(builtinOutput);
    const packJson = packList.formatters.json(packList.toOutput(packRows, {}));
    expect(packJson).toBe(builtinJson);
  });

  it("MCP envelope matches the built-in summary envelope", async () => {
    const resolution = await standardListStory.resolve(rt, {});
    expect(packList.toEnvelope(packRows)).toEqual(
      standardListStory.toEnvelope(resolution),
    );
  });

  it("plain output carries every standard in order — layout is a recorded gap", () => {
    const names = builtinOutput.items.map((item) => item.name);
    const builtinPlain = standardListStory.formatters.plain(builtinOutput);
    const packPlain = packList.formatters.plain(
      packList.toOutput(packRows, {}),
    );
    expectNamesInOrder(builtinPlain, names);
    expectNamesInOrder(packPlain, names);
    // Layout divergence pinned — see PARITY_GAPS "list plain template".
    expect(packPlain).not.toBe(builtinPlain);
  });

  it("llm output carries every standard in order — templates are a recorded gap", () => {
    const names = builtinOutput.items.map((item) => item.name);
    const builtinLlm = standardListStory.formatters.llm(builtinOutput);
    const packLlm = packList.formatters.llm(packList.toOutput(packRows, {}));
    expectNamesInOrder(builtinLlm, names);
    expectNamesInOrder(packLlm, names);
    // Heading divergence pinned — see PARITY_GAPS "list llm template".
    expect(builtinLlm.startsWith("## Standards\n")).toBe(true);
    expect(packLlm.startsWith(`## Standard (${packRows.length})\n`)).toBe(true);
    expect(packLlm).not.toBe(builtinLlm);
  });
});

describe("standard lookup parity (summary view)", () => {
  for (const name of PARITY_LOOKUP_NAMES) {
    it(`plain output for "${name}" matches modulo the URI field gap`, async () => {
      const builtinPlain = standardLookupStory.formatters.plain(
        standardLookupStory.toFmtInput(await lookupBuiltin(name), SUMMARY_VIEW),
      );
      const packPlain = packLookup.formatters.plain(
        packLookup.toFmtInput(await lookupPack(name), SUMMARY_VIEW),
      );
      expect(packPlain).toBe(dropUriField(builtinPlain, "  URI: "));
    });

    it(`llm output for "${name}" matches modulo the URI field gap`, async () => {
      const builtinLlm = standardLookupStory.formatters.llm(
        standardLookupStory.toFmtInput(await lookupBuiltin(name), SUMMARY_VIEW),
      );
      const packLlm = packLookup.formatters.llm(
        packLookup.toFmtInput(await lookupPack(name), SUMMARY_VIEW),
      );
      expect(packLlm).toBe(dropUriField(builtinLlm, "- URI: "));
    });

    it(`json output for "${name}" is byte-identical`, async () => {
      const builtinJson = standardLookupStory.formatters.json(
        standardLookupStory.toFmtInput(await lookupBuiltin(name), SUMMARY_VIEW),
      );
      const packJson = packLookup.formatters.json(
        packLookup.toFmtInput(await lookupPack(name), SUMMARY_VIEW),
      );
      expect(packJson).toBe(builtinJson);
    });
  }
});

describe("standard lookup parity — cs:extends divergence", () => {
  it("plain and llm stay byte-identical modulo the URI field", async () => {
    const builtinInput = standardLookupStory.toFmtInput(
      await lookupBuiltin(EXTENDS_LOOKUP_NAME),
      SUMMARY_VIEW,
    );
    const packInput = packLookup.toFmtInput(
      await lookupPack(EXTENDS_LOOKUP_NAME),
      SUMMARY_VIEW,
    );
    expect(packLookup.formatters.plain(packInput)).toBe(
      dropUriField(
        standardLookupStory.formatters.plain(builtinInput),
        "  URI: ",
      ),
    );
    expect(packLookup.formatters.llm(packInput)).toBe(
      dropUriField(standardLookupStory.formatters.llm(builtinInput), "- URI: "),
    );
  });

  it("json diverges only on extends compaction — a recorded gap", async () => {
    const builtinJson = standardLookupStory.formatters.json(
      standardLookupStory.toFmtInput(
        await lookupBuiltin(EXTENDS_LOOKUP_NAME),
        SUMMARY_VIEW,
      ),
    );
    const packJson = packLookup.formatters.json(
      packLookup.toFmtInput(
        await lookupPack(EXTENDS_LOOKUP_NAME),
        SUMMARY_VIEW,
      ),
    );
    // Divergence pinned — see PARITY_GAPS "lookup data compaction".
    expect(packJson).not.toBe(builtinJson);

    const builtinParsed = JSON.parse(builtinJson) as Record<string, string>;
    const packParsed = JSON.parse(packJson) as Record<string, string>;
    const packExtends = packParsed.extends;
    if (packExtends === undefined) {
      throw new Error(`expected cs:extends on "${EXTENDS_LOOKUP_NAME}"`);
    }
    // The built-in compacts extends in resolved data; the pack keeps the
    // raw IRI. Compacting the pack value restores byte-level agreement.
    expect({
      ...packParsed,
      extends: compactUri(packExtends, PREFIX_MAP),
    }).toEqual(builtinParsed);
    expect(
      JSON.stringify(
        { ...packParsed, extends: compactUri(packExtends, PREFIX_MAP) },
        null,
        2,
      ),
    ).toBe(builtinJson);
  });
});

describe("standard lookup miss parity", () => {
  it("collects identical not-found entries with ranked suggestions", async () => {
    const builtinResult = await standardLookupStory.resolve(
      rt,
      [NEAR_MISS_NAME],
      {},
    );
    const packResult = await packLookup.resolve(rt, [NEAR_MISS_NAME], {});
    expect(builtinResult.results).toEqual([]);
    expect(packResult.results).toEqual([]);

    const builtinError = builtinResult.errors.at(0);
    const packError = packResult.errors.at(0);
    if (builtinError === undefined || packError === undefined) {
      throw new Error("both paths must report a not-found error");
    }
    expect(packError).toEqual(builtinError);
    expect(builtinError.code).toBe("ENTITY_NOT_FOUND");
    expect(builtinError.suggestions).toContain("code/function/purity");
  });
});
