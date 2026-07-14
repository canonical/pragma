/**
 * Reusable pack-vs-built-in byte-parity harness.
 *
 * This is the acceptance instrument for the built-in-noun → declarative
 * story-pack migration. Given one built-in noun (its list and lookup read
 * stories) and the story-pack definition that aims to replace it,
 * {@link packParity} compiles the pack through the same kernel the built-in
 * uses and asserts, surface by surface, that the two paths render
 * **byte-for-byte** identical output — or, where the v0 pack format cannot
 * yet reach parity, that they diverge in exactly the ways an allowlist
 * records and nowhere else.
 *
 * ## Surfaces asserted
 *
 * For both the `list` and the `lookup` verb, every consumer-facing surface
 * is compared at the view its real consumer sees by default:
 *
 * - **plain** — the CLI text formatter (`formatters.plain`), lookup at the
 *   CLI default view (`detailed: false`).
 * - **llm** — the CLI `--llm` formatter (`formatters.llm`), same view.
 * - **json** — the CLI `--json` formatter (`formatters.json`), same view.
 * - **envelope** — the MCP `{ data, meta }` payload, obtained by compiling
 *   the story to its `ToolSpec` ({@link compileReadTool} /
 *   {@link compileLookupTool}) and executing it with default parameters, so
 *   the built-in's MCP defaults (e.g. lookup `detailed: true`) and summary
 *   projection are exercised exactly as an agent would hit them. Compared
 *   with a deep equal.
 * - **condensed** — the MCP condensed text (`condense(...).text`) from the
 *   same compiled tool executed with `{ condensed: true }`. Compared as a
 *   string, byte for byte.
 *
 * plus **not-found recovery**: a near-miss query is resolved through both
 * paths and the collected `LookupResult` error entry (code, message, and
 * ranked suggestions) is deep-equal compared.
 *
 * ## expectedDivergences — a burn-down list, not a mute
 *
 * Every surface not named in an `expectedDivergences` allowlist MUST be
 * byte-identical; a regression there fails the suite. For every surface
 * that IS named, the harness asserts the opposite — that the surface
 * **diverges** (a pinned `.not.toBe` / `.not.toEqual`). So when the pack
 * format gains a capability and a surface silently reaches parity, its
 * pinned-divergence `it()` **fails**, forcing the stale allowlist entry to
 * be deleted. The allowlist can only ever shrink; it is a burn-down of the
 * remaining gaps, never a way to silence drift. Each entry's value is the
 * human-readable reason the surface diverges; passing `knownDivergences`
 * (the noun's gap ledger) makes the harness assert every reason used is a
 * documented gap, keeping allowlist and ledger in lockstep.
 *
 * ## Ink / TUI is excluded by default
 *
 * The interactive Ink renderers (`story.renderInk`) are **not** asserted by
 * default. The ratified decision is *plain-in-TUI*: a compiled pack declares
 * no `renderInk`, so its TUI path falls back to the plain formatter, which
 * the `plain` surface already covers byte-for-byte — re-asserting it as Ink
 * would add nothing, and the built-in's `renderInk` returns a React element
 * that has no string form to byte-compare against the pack's absent one.
 * Passing `ink: true` opts into the one trivial, meaningful check: that the
 * built-in declares `renderInk` while the pack does not, pinning the
 * "no pack Ink renderer" gap so a future pack `renderInk` trips the suite.
 *
 * @module
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LookupResult } from "../domains/shared/contracts.js";
import {
  compileLookupTool,
  compileReadTool,
} from "../domains/shared/stories/index.js";
import compilePackStories from "../domains/shared/stories/pack/compilePackStories.js";
import type { StoryPackDefinition } from "../domains/shared/stories/pack/types.js";
import validateStoryPackDefinition from "../domains/shared/stories/pack/validateStoryPackDefinition.js";
import type {
  LookupStory,
  LookupStoryView,
  ReadStory,
} from "../domains/shared/stories/types.js";
import type { ToolResult } from "../domains/shared/ToolSpec.js";
import type { PragmaRuntime } from "../domains/shared/types/index.js";

/**
 * The consumer-facing surfaces compared for each verb. Both `list` and
 * `lookup` project to the same five; only `envelope` is a structured
 * payload (deep compared) — the rest are strings (byte compared).
 */
export const PARITY_SURFACES = [
  "plain",
  "llm",
  "json",
  "envelope",
  "condensed",
] as const;

/** One rendered surface of a read story. */
export type ParitySurface = (typeof PARITY_SURFACES)[number];

/**
 * An allowlist of surfaces expected to diverge, each mapped to the reason
 * (ideally an entry from the noun's gap ledger). A surface absent from the
 * map must be byte-identical; a surface present must diverge.
 */
export type ExpectedDivergences = Partial<Record<ParitySurface, string>>;

/** A single runtime booted for the parity run, with its teardown. */
export interface PackParityRuntime {
  /** Runtime whose `store` both paths resolve against. */
  readonly rt: PragmaRuntime;
  /** Tear down the store (called once in `afterAll`). */
  readonly dispose?: () => void | Promise<void>;
}

/** One entity to look up, with any surfaces that diverge for it alone. */
export interface PackParityLookupCase {
  /** A real entity name resolvable by both the built-in and the pack. */
  readonly name: string;
  /**
   * Surfaces expected to diverge **for this entity specifically**, merged
   * over the shared `lookup.expectedDivergences`. Use it to pin
   * entity-dependent gaps (e.g. a value the built-in compacts in resolved
   * data). A per-case entry adds to, or overrides the reason of, the shared
   * set; it cannot mark a shared-divergent surface as identical.
   */
  readonly expectedDivergences?: ExpectedDivergences;
}

/** Parity configuration for a built-in list story vs its pack list. */
export interface PackParityListConfig<TData, TOutput> {
  /** The built-in list read story. */
  readonly story: ReadStory<TData, TOutput>;
  /** Surfaces the pack list is allowed to diverge on. */
  readonly expectedDivergences?: ExpectedDivergences;
}

/** Parity configuration for a built-in lookup story vs its pack lookup. */
export interface PackParityLookupConfig<TDetailed, TFmtInput> {
  /** The built-in lookup story. */
  readonly story: LookupStory<TDetailed, TFmtInput>;
  /** Real entities to look up through both paths. */
  readonly names: readonly PackParityLookupCase[];
  /** A near-miss query that resolves to no entity in either path. */
  readonly nearMiss: string;
  /** Surfaces every looked-up entity is allowed to diverge on. */
  readonly expectedDivergences?: ExpectedDivergences;
  /**
   * When set, the near-miss recovery is asserted to **diverge** (reason
   * recorded here) instead of being deep-equal. Omit when the built-in and
   * pack produce identical not-found errors incl. ranked suggestions.
   */
  readonly nearMissExpectedDivergence?: string;
}

/**
 * Everything {@link packParity} needs to assert one noun's pack against its
 * built-in stories.
 */
export interface PackParityConfig<
  TListData,
  TListOutput,
  TDetailed,
  TFmtInput,
> {
  /** The command noun, used only for describe-block titles. */
  readonly noun: string;
  /** The story-pack definition under test. */
  readonly definition: StoryPackDefinition;
  /** Where the definition came from — passed to the compiler for diagnostics. */
  readonly source: string;
  /**
   * The merged prefix map the built-ins display with (typically
   * `{ ...PREFIX_MAP }` plus any config prefixes). The pack is compiled with
   * exactly this map so foreign namespaces compact identically.
   */
  readonly prefixes: Readonly<Record<string, string>>;
  /**
   * Boot the store both paths resolve against, and return its teardown. The
   * caller owns package selection (the harness is noun-agnostic), so it
   * decides which semantic packages to load.
   */
  readonly bootRuntime: () => Promise<PackParityRuntime>;
  /** The built-in list story and its list allowlist. */
  readonly list: PackParityListConfig<TListData, TListOutput>;
  /** The built-in lookup story, entities, near-miss, and lookup allowlist. */
  readonly lookup: PackParityLookupConfig<TDetailed, TFmtInput>;
  /**
   * The noun's gap ledger. When provided, the harness asserts every reason
   * used across all allowlists is one of these strings, so the allowlist
   * cannot drift from the documented burn-down list.
   */
  readonly knownDivergences?: readonly string[];
  /**
   * Assert the Ink/TUI structural gap (built-in has `renderInk`, pack does
   * not). Defaults to `false` — see the module TSDoc for why TUI parity is
   * excluded by default.
   */
  readonly ink?: boolean;
}

/** The CLI default lookup view: summary detail, no extra parameters. */
const SUMMARY_VIEW: LookupStoryView = {
  surface: "cli",
  detailed: false,
  params: {},
};

/** The built-in and pack renderings of one surface, awaiting comparison. */
interface SurfacePair {
  readonly builtin: unknown;
  readonly pack: unknown;
}

/**
 * Emit the parity suite for one noun: byte-equality on every surface the
 * pack reaches, and a pinned divergence on every surface the allowlist
 * records. Call at module top level (it registers `describe`/`it` blocks).
 *
 * @param config - The built-in stories, pack definition, look-up entities,
 *   and the burn-down allowlist for this noun.
 */
export function packParity<TListData, TListOutput, TDetailed, TFmtInput>(
  config: PackParityConfig<TListData, TListOutput, TDetailed, TFmtInput>,
): void {
  const { noun, definition, source, prefixes, list, lookup } = config;

  const compiled = compilePackStories(definition, source, prefixes);
  const packList = compiled.list;
  const packLookup = compiled.lookup;
  if (packLookup === undefined) {
    throw new Error(
      `packParity: "${noun}" pack declares no lookup story, but lookup parity was requested`,
    );
  }

  const builtinListTool = compileReadTool(list.story);
  const packListTool = compileReadTool(packList);
  const builtinLookupTool = compileLookupTool(lookup.story);
  const packLookupTool = compileLookupTool(packLookup);

  describe(`${noun}: story-pack ↔ built-in byte parity`, () => {
    let rt: PragmaRuntime;
    let dispose: PackParityRuntime["dispose"];

    beforeAll(async () => {
      const booted = await config.bootRuntime();
      rt = booted.rt;
      dispose = booted.dispose;
    });

    afterAll(async () => {
      await dispose?.();
    });

    describe("pack definition", () => {
      it("round-trips as declarative JSON and validates as a v0 pack", () => {
        const raw: unknown = JSON.parse(JSON.stringify(definition));
        expect(validateStoryPackDefinition(raw, source)).toEqual(definition);
      });
    });

    describe("list", () => {
      let surfaces: Record<ParitySurface, SurfacePair>;

      beforeAll(async () => {
        const [builtinData, packData] = await Promise.all([
          list.story.resolve(rt, {}),
          packList.resolve(rt, {}),
        ]);
        const builtinOutput = list.story.toOutput(builtinData, {});
        const packOutput = packList.toOutput(packData, {});
        surfaces = {
          plain: {
            builtin: list.story.formatters.plain(builtinOutput),
            pack: packList.formatters.plain(packOutput),
          },
          llm: {
            builtin: list.story.formatters.llm(builtinOutput),
            pack: packList.formatters.llm(packOutput),
          },
          json: {
            builtin: list.story.formatters.json(builtinOutput),
            pack: packList.formatters.json(packOutput),
          },
          envelope: {
            builtin: envelopeOf(await builtinListTool.execute(rt, {})),
            pack: envelopeOf(await packListTool.execute(rt, {})),
          },
          condensed: {
            builtin: condensedText(
              await builtinListTool.execute(rt, { condensed: true }),
            ),
            pack: condensedText(
              await packListTool.execute(rt, { condensed: true }),
            ),
          },
        };
      });

      emitSurfaceCases(() => surfaces, list.expectedDivergences ?? {});
    });

    for (const lookupCase of lookup.names) {
      const { name } = lookupCase;
      const effective: ExpectedDivergences = {
        ...(lookup.expectedDivergences ?? {}),
        ...(lookupCase.expectedDivergences ?? {}),
      };

      describe(`lookup "${name}"`, () => {
        let surfaces: Record<ParitySurface, SurfacePair>;

        beforeAll(async () => {
          const builtinEntity = requireEntity(
            await lookup.story.resolve(rt, [name], {}),
            "built-in",
            name,
          );
          const packEntity = requireEntity(
            await packLookup.resolve(rt, [name], {}),
            "pack",
            name,
          );
          const builtinFmt = lookup.story.toFmtInput(
            builtinEntity,
            SUMMARY_VIEW,
          );
          const packFmt = packLookup.toFmtInput(packEntity, SUMMARY_VIEW);
          surfaces = {
            plain: {
              builtin: lookup.story.formatters.plain(builtinFmt),
              pack: packLookup.formatters.plain(packFmt),
            },
            llm: {
              builtin: lookup.story.formatters.llm(builtinFmt),
              pack: packLookup.formatters.llm(packFmt),
            },
            json: {
              builtin: lookup.story.formatters.json(builtinFmt),
              pack: packLookup.formatters.json(packFmt),
            },
            envelope: {
              builtin: envelopeOf(
                await builtinLookupTool.execute(rt, { names: [name] }),
              ),
              pack: envelopeOf(
                await packLookupTool.execute(rt, { names: [name] }),
              ),
            },
            condensed: {
              builtin: condensedText(
                await builtinLookupTool.execute(rt, {
                  names: [name],
                  condensed: true,
                }),
              ),
              pack: condensedText(
                await packLookupTool.execute(rt, {
                  names: [name],
                  condensed: true,
                }),
              ),
            },
          };
        });

        emitSurfaceCases(() => surfaces, effective);
      });
    }

    describe("lookup not-found recovery", () => {
      let builtinResult: LookupResult<TDetailed>;
      let packResult: LookupResult<Record<string, string>>;

      beforeAll(async () => {
        builtinResult = await lookup.story.resolve(rt, [lookup.nearMiss], {});
        packResult = await packLookup.resolve(rt, [lookup.nearMiss], {});
      });

      it("both paths resolve the near-miss to no entity", () => {
        expect(builtinResult.results).toEqual([]);
        expect(packResult.results).toEqual([]);
      });

      const reason = lookup.nearMissExpectedDivergence;
      const title =
        reason === undefined
          ? "not-found error is identical incl. ranked suggestions"
          : `not-found error diverges (allowlisted): ${reason}`;
      it(title, () => {
        const builtinError = builtinResult.errors.at(0);
        const packError = packResult.errors.at(0);
        if (builtinError === undefined || packError === undefined) {
          throw new Error("both paths must report a not-found error");
        }
        if (reason === undefined) {
          expect(packError).toEqual(builtinError);
          expect(builtinError.suggestions?.length ?? 0).toBeGreaterThan(0);
        } else {
          expect(packError).not.toEqual(builtinError);
        }
      });
    });

    if (config.knownDivergences !== undefined) {
      const known = new Set(config.knownDivergences);
      const reasons = collectReasons(config);
      describe("divergence ledger", () => {
        it("every allowlisted reason is a documented gap", () => {
          for (const reason of reasons) {
            expect(
              known.has(reason),
              `allowlist reason is not in knownDivergences: ${reason}`,
            ).toBe(true);
          }
        });
      });
    }

    if (config.ink === true) {
      describe("tui (ink)", () => {
        it("built-in declares renderInk; pack does not — a pinned gap", () => {
          expect(typeof list.story.renderInk).toBe("function");
          expect(typeof lookup.story.renderInk).toBe("function");
          expect(packList.renderInk).toBeUndefined();
          expect(packLookup.renderInk).toBeUndefined();
        });
      });
    }
  });
}

/**
 * Emit one `it()` per surface: byte-equality when the surface is not
 * allowlisted, a pinned divergence when it is. `getSurfaces` is read lazily
 * inside each case so the enclosing `beforeAll` has populated it.
 */
function emitSurfaceCases(
  getSurfaces: () => Record<ParitySurface, SurfacePair>,
  divergences: ExpectedDivergences,
): void {
  for (const surface of PARITY_SURFACES) {
    const reason = divergences[surface];
    const deep = surface === "envelope";
    const title =
      reason === undefined
        ? `${surface} is byte-identical`
        : `${surface} diverges (allowlisted): ${reason}`;
    it(title, () => {
      assertPair(getSurfaces()[surface], deep, reason);
    });
  }
}

/**
 * Assert one surface pair. With no `reason`, the pack must match the
 * built-in (deep for the envelope, byte for strings). With a `reason`, the
 * pack must diverge — the pinned assertion that fails the moment a gap
 * silently closes.
 */
function assertPair(
  pair: SurfacePair,
  deep: boolean,
  reason: string | undefined,
): void {
  if (reason === undefined) {
    if (deep) {
      expect(pair.pack).toEqual(pair.builtin);
    } else {
      expect(pair.pack).toBe(pair.builtin);
    }
    return;
  }
  if (deep) {
    expect(pair.pack).not.toEqual(pair.builtin);
  } else {
    expect(pair.pack).not.toBe(pair.builtin);
  }
}

/** Narrow a tool result to its `{ data, meta }` envelope, or fail loudly. */
function envelopeOf(result: ToolResult): {
  data: unknown;
  meta?: Record<string, unknown>;
} {
  if ("condensed" in result) {
    throw new Error("expected an envelope tool result, got a condensed one");
  }
  return result;
}

/** Narrow a tool result to its condensed `text`, or fail loudly. */
function condensedText(result: ToolResult): string {
  if (!("condensed" in result)) {
    throw new Error("expected a condensed tool result, got an envelope");
  }
  return result.text;
}

/** The first resolved entity, asserting the lookup succeeded cleanly. */
function requireEntity<TEntity>(
  result: LookupResult<TEntity>,
  path: "built-in" | "pack",
  name: string,
): TEntity {
  expect(result.errors).toEqual([]);
  const entity = result.results.at(0);
  if (entity === undefined) {
    throw new Error(`${path} lookup found no result for "${name}"`);
  }
  return entity;
}

/** Every reason string used across all of a config's allowlists. */
function collectReasons<TListData, TListOutput, TDetailed, TFmtInput>(
  config: PackParityConfig<TListData, TListOutput, TDetailed, TFmtInput>,
): Set<string> {
  const reasons = new Set<string>();
  for (const reason of Object.values(config.list.expectedDivergences ?? {})) {
    reasons.add(reason);
  }
  for (const reason of Object.values(config.lookup.expectedDivergences ?? {})) {
    reasons.add(reason);
  }
  for (const lookupCase of config.lookup.names) {
    for (const reason of Object.values(lookupCase.expectedDivergences ?? {})) {
      reasons.add(reason);
    }
  }
  if (config.lookup.nearMissExpectedDivergence !== undefined) {
    reasons.add(config.lookup.nearMissExpectedDivergence);
  }
  return reasons;
}
