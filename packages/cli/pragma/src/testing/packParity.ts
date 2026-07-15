/**
 * Reusable pack-vs-built-in byte-parity harness.
 *
 * This is the acceptance instrument for the built-in-noun → declarative
 * story-pack migration. Given one built-in noun (its list and, optionally,
 * its lookup read stories) and the story-pack definition that aims to
 * replace it, {@link packParity} compiles the pack through the same kernel
 * the built-in uses and asserts, surface by surface, that the two paths
 * render **byte-for-byte** identical output — or, where the v0 pack format
 * cannot yet reach parity, that they diverge in exactly the ways an
 * allowlist records and nowhere else.
 *
 * ## Surfaces asserted
 *
 * For the `list` verb, and for each `lookup` case when a lookup is
 * configured, every consumer-facing surface is compared at the view its
 * real consumer sees by default:
 *
 * - **plain** — the CLI text formatter (`formatters.plain`), lookup at the
 *   CLI default view (`detailed: false`).
 * - **llm** — the CLI `--llm` formatter (`formatters.llm`), same view.
 * - **json** — the CLI `--json` formatter (`formatters.json`), same view.
 * - **envelope** — the MCP `{ data, meta }` payload, obtained by compiling
 *   the story to its `ToolSpec` ({@link compileReadTool} /
 *   {@link compileLookupTool}) and executing it with the surface's default
 *   parameters. This is the view an agent hits by default, which is **not**
 *   always the summary projection: for a lookup story with a `detailedParam`
 *   the MCP default is `detailed: true`, which returns the full entity and
 *   **skips** the story's `project` — only a `detailed: false` call would
 *   exercise the summary projection. Compared with a deep equal.
 * - **condensed** — the MCP condensed text (`condense(...).text`) from the
 *   same compiled tool executed with `{ condensed: true }`. Compared as a
 *   string, byte for byte.
 *
 * plus **not-found recovery**: a near-miss query is resolved through both
 * paths and the collected `LookupResult` error entry (code, message, and
 * ranked suggestions) is deep-equal compared. `LookupResult.errors` is a
 * reduced entry — `lookupMany` drops the thrown `PragmaError`'s `recovery`
 * and `crossDomain`. To compare the **full** error contract the ledger
 * tracks, supply `lookup.resolveBuiltinNotFound`: the built-in's real
 * thrown error (recovery + cross-domain hints included) is paired against
 * the pack's reachable reduced entry, and any authored-recovery delta is
 * pinned and confined exactly like a surface divergence (see below).
 *
 * ## Confined divergence — normalize-then-compare
 *
 * An `expectedDivergences` entry may be a bare reason string (the weaker,
 * unconfined mode: the surface is only asserted to **differ**, `.not`) or a
 * {@link DivergenceSpec} carrying a `normalize` transform. With a
 * normalizer the harness asserts **both**: (a) the raw forms differ (the
 * burn-down pin) **and** (b) the normalized forms are byte-equal — proving
 * the divergence is exactly the known, allowlisted delta and nothing more.
 * A regression that adds a second, unrelated divergence then fails the
 * normalized-equal half even though the raw forms still differ.
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
 * remaining gaps, never a way to silence drift. Each entry's reason is the
 * human-readable explanation the surface diverges; passing `knownDivergences`
 * (the noun's gap ledger) makes the harness assert every reason used is a
 * documented gap, keeping allowlist and ledger in lockstep.
 *
 * ## Parameterized surfaces
 *
 * The `list` verb accepts `paramVariations`, and each lookup case accepts
 * `params`/`detailed`, so filter/disclosure/aspect views can be exercised —
 * every variation runs both paths at those parameters and byte-compares
 * every surface through the same allowlist/normalize machinery. The default
 * is a single implicit default-view variation (today's behavior); Wave 3,
 * when packs gain authorable parameters, supplies real variations here to
 * close the parameterized-view coverage hole that a default-only run leaves.
 *
 * ## Optional lookup
 *
 * The pack format permits a list-only noun. When `lookup` is omitted the
 * harness emits only the list and pack-definition cases and skips every
 * lookup, not-found, and lookup-Ink assertion.
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
import type { ToolResult, ToolSpec } from "../domains/shared/ToolSpec.js";
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
 * A normalizer over one rendered surface, applied to both the built-in and
 * the pack form before the byte-equal half of a confined divergence. It
 * receives the surface value (a string for every surface except `envelope`,
 * which is the structured `{ data, meta }` object) as `unknown` — because
 * the harness holds surfaces untyped — and must narrow it at runtime. It
 * should strip only the allowlisted delta so the transformed forms agree
 * exactly when, and only when, the divergence is confined to that delta.
 */
export type SurfaceNormalize = (rendered: unknown) => unknown;

/**
 * A surface expected to diverge, carrying the reason plus an optional
 * `normalize` that confines the divergence. When `normalize` is present the
 * harness asserts the raw forms differ **and** the normalized forms are
 * byte-equal; when absent, only that the raw forms differ (the weaker mode).
 */
export interface DivergenceSpec {
  /** Human-readable reason (ideally a verbatim gap-ledger entry). */
  readonly reason: string;
  /** Confines the divergence to exactly the normalized-away delta. */
  readonly normalize?: SurfaceNormalize;
}

/**
 * An allowlist entry: either a bare reason (unconfined `.not`-only mode) or
 * a {@link DivergenceSpec} whose `normalize` confines the divergence.
 */
export type ExpectedDivergence = string | DivergenceSpec;

/**
 * An allowlist of surfaces expected to diverge. A surface absent from the
 * map must be byte-identical; a surface present must diverge (and, when its
 * entry carries a `normalize`, diverge in exactly the confined way).
 */
export type ExpectedDivergences = Partial<
  Record<ParitySurface, ExpectedDivergence>
>;

/**
 * One set of parameters at which to exercise a verb's surfaces. Every
 * variation runs both paths at `params` and byte-compares every surface.
 */
export interface ParamVariation {
  /** Sub-describe title identifying the variation (e.g. "--category react"). */
  readonly label: string;
  /** Parameters passed to both paths' resolve and compiled tool. */
  readonly params: Record<string, unknown>;
}

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
   * data). A per-case entry adds to, or overrides the reason/normalizer of,
   * the shared set; it cannot mark a shared-divergent surface as identical.
   */
  readonly expectedDivergences?: ExpectedDivergences;
  /**
   * Extra parameters passed to this case's resolve and compiled tool —
   * filters, aspect selections, or a `detailed` toggle. Defaults to `{}`
   * (the default view). Use it to exercise a non-default lookup view.
   */
  readonly params?: Record<string, unknown>;
  /**
   * The CLI view's effective `detailed` for this case's plain/llm/json
   * surfaces. Defaults to `false` (the CLI default). The MCP envelope and
   * condensed surfaces derive their own `detailed` from `params` via the
   * compiled tool, matching how an agent hits them.
   */
  readonly detailed?: boolean;
}

/** Parity configuration for a built-in list story vs its pack list. */
export interface PackParityListConfig<TData, TOutput> {
  /** The built-in list read story. */
  readonly story: ReadStory<TData, TOutput>;
  /** Surfaces the pack list is allowed to diverge on. */
  readonly expectedDivergences?: ExpectedDivergences;
  /**
   * Parameter views to exercise. Each variation runs both paths at its
   * `params` and byte-compares every surface through the shared allowlist.
   * Defaults to a single implicit default-view variation (`params: {}`),
   * i.e. today's behavior. Wave 3 (when packs gain authorable parameters)
   * supplies real variations here to cover filter/disclosure parity.
   */
  readonly paramVariations?: readonly ParamVariation[];
}

/**
 * The full not-found error contract — the fields `lookupMany` drops from
 * `LookupResult.errors`. Built by the caller from a path's thrown
 * `PragmaError` (built-in) or its reachable reduced entry (a compiled pack,
 * whose throwing lookup is private and equally reduced).
 */
export interface PackParityNotFoundContract {
  /** Machine-readable error code (e.g. `ENTITY_NOT_FOUND`). */
  readonly code: string;
  /** Human-readable message. */
  readonly message: string;
  /** Ranked near-miss suggestions. */
  readonly suggestions?: readonly string[];
  /** Structured recovery hint (`{ message, cli, mcp }`), if any. */
  readonly recovery?: unknown;
  /** Cross-domain redirect hint, if any. */
  readonly crossDomain?: unknown;
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
   * recorded here) instead of being identical. Omit when the built-in and
   * pack produce identical not-found errors incl. ranked suggestions.
   *
   * The reduced `LookupResult.errors` entries are usually identical (they
   * carry no recovery/crossDomain), so a divergence is typically only
   * observable together with {@link resolveBuiltinNotFound}, which surfaces
   * the built-in's authored recovery copy.
   */
  readonly nearMissExpectedDivergence?: string;
  /**
   * Resolve the built-in's **full** not-found contract for the near-miss —
   * `recovery` and `crossDomain` included — reaching past `lookupMany`,
   * which strips them from `LookupResult.errors`. When provided, the
   * not-found parity compares this full contract against the pack's
   * reachable reduced entry (a compiled pack's throwing lookup is private,
   * so its recovery is unreachable and treated as absent). Omit to compare
   * only the reduced entries (the weaker, symmetric mode).
   */
  readonly resolveBuiltinNotFound?: (
    rt: PragmaRuntime,
    nearMiss: string,
  ) => Promise<PackParityNotFoundContract>;
  /**
   * Normalizer applied to both not-found contracts before the byte-equal
   * half of a pinned `nearMissExpectedDivergence`, confining the divergence
   * to exactly the normalized-away delta (e.g. the authored recovery copy).
   * Only consulted when `resolveBuiltinNotFound` is set.
   */
  readonly nearMissNormalize?: (
    contract: PackParityNotFoundContract,
  ) => unknown;
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
  /**
   * The built-in lookup story, entities, near-miss, and lookup allowlist.
   * Omit for a list-only noun: the harness then emits only the list and
   * pack-definition cases and skips every lookup and not-found assertion.
   */
  readonly lookup?: PackParityLookupConfig<TDetailed, TFmtInput>;
  /**
   * The noun's gap ledger. When provided, the harness asserts every reason
   * used across all allowlists is one of these strings, so the allowlist
   * cannot drift from the documented burn-down list.
   */
  readonly knownDivergences?: readonly string[];
  /**
   * Assert the Ink/TUI structural gap (built-in has `renderInk`, pack does
   * not). Defaults to `false` — see the module TSDoc for why TUI parity is
   * excluded by default. The lookup half is only asserted when a `lookup`
   * is configured.
   */
  readonly ink?: boolean;
}

/** The single implicit list variation when none are configured. */
const DEFAULT_LIST_VARIATION: ParamVariation = {
  label: "default view",
  params: {},
};

/** The built-in and pack renderings of one surface, awaiting comparison. */
interface SurfacePair {
  readonly builtin: unknown;
  readonly pack: unknown;
}

/**
 * Emit the parity suite for one noun: byte-equality on every surface the
 * pack reaches, and a pinned (optionally confined) divergence on every
 * surface the allowlist records. Call at module top level (it registers
 * `describe`/`it` blocks).
 *
 * @param config - The built-in stories, pack definition, look-up entities,
 *   and the burn-down allowlist for this noun.
 */
export function packParity<TListData, TListOutput, TDetailed, TFmtInput>(
  config: PackParityConfig<TListData, TListOutput, TDetailed, TFmtInput>,
): void {
  const { noun, definition, source, prefixes, list } = config;
  const lookup = config.lookup;

  const compiled = compilePackStories(definition, source, prefixes);
  const packList = compiled.list;
  const builtinListTool = compileReadTool(list.story);
  const packListTool = compileReadTool(packList);

  const lookupTools = buildLookupTools(compiled.lookup, lookup, noun);

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
      const variations =
        list.paramVariations && list.paramVariations.length > 0
          ? list.paramVariations
          : [DEFAULT_LIST_VARIATION];
      for (const variation of variations) {
        const emit = (): void => {
          let surfaces: Record<ParitySurface, SurfacePair>;
          beforeAll(async () => {
            surfaces = await buildListSurfaces(
              rt,
              list.story,
              packList,
              builtinListTool,
              packListTool,
              variation.params,
            );
          });
          emitSurfaceCases(() => surfaces, list.expectedDivergences ?? {});
        };
        // A single default variation stays inline (today's structure); real
        // variations each get their own sub-describe for a readable report.
        if (variations.length === 1) {
          emit();
        } else {
          describe(variation.label, emit);
        }
      }
    });

    if (lookup !== undefined && lookupTools !== undefined) {
      for (const lookupCase of lookup.names) {
        const { name } = lookupCase;
        const effective: ExpectedDivergences = {
          ...(lookup.expectedDivergences ?? {}),
          ...(lookupCase.expectedDivergences ?? {}),
        };

        describe(`lookup "${name}"`, () => {
          let surfaces: Record<ParitySurface, SurfacePair>;

          beforeAll(async () => {
            surfaces = await buildLookupSurfaces(
              rt,
              lookup.story,
              lookupTools.packLookup,
              lookupTools.builtinLookupTool,
              lookupTools.packLookupTool,
              name,
              lookupCase.params ?? {},
              lookupCase.detailed ?? false,
            );
          });

          emitSurfaceCases(() => surfaces, effective);
        });
      }

      emitNotFoundCases(() => rt, lookup, lookupTools.packLookup);
    }

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
          expect(packList.renderInk).toBeUndefined();
          if (lookup !== undefined && lookupTools !== undefined) {
            expect(typeof lookup.story.renderInk).toBe("function");
            expect(lookupTools.packLookup.renderInk).toBeUndefined();
          }
        });
      });
    }
  });
}

/** The compiled pack lookup story and both compiled lookup tools. */
interface LookupTools {
  readonly packLookup: LookupStory<
    Record<string, string>,
    Record<string, string>
  >;
  readonly builtinLookupTool: ToolSpec;
  readonly packLookupTool: ToolSpec;
}

/**
 * Compile both lookup tools, or `undefined` when no lookup is configured.
 * Fails loudly if lookup parity is requested but the pack declares none.
 */
function buildLookupTools<TDetailed, TFmtInput>(
  packLookup:
    | LookupStory<Record<string, string>, Record<string, string>>
    | undefined,
  lookup: PackParityLookupConfig<TDetailed, TFmtInput> | undefined,
  noun: string,
): LookupTools | undefined {
  if (lookup === undefined) {
    return undefined;
  }
  if (packLookup === undefined) {
    throw new Error(
      `packParity: "${noun}" requested lookup parity, but the pack declares no lookup story`,
    );
  }
  return {
    packLookup,
    builtinLookupTool: compileLookupTool(lookup.story),
    packLookupTool: compileLookupTool(packLookup),
  };
}

/** Resolve both paths' list output and render the five comparable surfaces. */
async function buildListSurfaces<TData, TOutput>(
  rt: PragmaRuntime,
  story: ReadStory<TData, TOutput>,
  packList: ReadStory<Record<string, string>[], Record<string, string>[]>,
  builtinTool: ToolSpec,
  packTool: ToolSpec,
  params: Record<string, unknown>,
): Promise<Record<ParitySurface, SurfacePair>> {
  const [builtinData, packData] = await Promise.all([
    story.resolve(rt, params),
    packList.resolve(rt, params),
  ]);
  const builtinOutput = story.toOutput(builtinData, params);
  const packOutput = packList.toOutput(packData, params);
  return {
    plain: {
      builtin: story.formatters.plain(builtinOutput),
      pack: packList.formatters.plain(packOutput),
    },
    llm: {
      builtin: story.formatters.llm(builtinOutput),
      pack: packList.formatters.llm(packOutput),
    },
    json: {
      builtin: story.formatters.json(builtinOutput),
      pack: packList.formatters.json(packOutput),
    },
    envelope: {
      builtin: envelopeOf(await builtinTool.execute(rt, { ...params })),
      pack: envelopeOf(await packTool.execute(rt, { ...params })),
    },
    condensed: {
      builtin: condensedText(
        await builtinTool.execute(rt, { ...params, condensed: true }),
      ),
      pack: condensedText(
        await packTool.execute(rt, { ...params, condensed: true }),
      ),
    },
  };
}

/** Resolve one entity through both paths and render the five surfaces. */
async function buildLookupSurfaces<TDetailed, TFmtInput>(
  rt: PragmaRuntime,
  story: LookupStory<TDetailed, TFmtInput>,
  packLookup: LookupStory<Record<string, string>, Record<string, string>>,
  builtinTool: ToolSpec,
  packTool: ToolSpec,
  name: string,
  params: Record<string, unknown>,
  detailed: boolean,
): Promise<Record<ParitySurface, SurfacePair>> {
  const view: LookupStoryView = { surface: "cli", detailed, params };
  const builtinEntity = requireEntity(
    await story.resolve(rt, [name], params),
    "built-in",
    name,
  );
  const packEntity = requireEntity(
    await packLookup.resolve(rt, [name], params),
    "pack",
    name,
  );
  const builtinFmt = story.toFmtInput(builtinEntity, view);
  const packFmt = packLookup.toFmtInput(packEntity, view);
  const toolParams: Record<string, unknown> = { names: [name], ...params };
  return {
    plain: {
      builtin: story.formatters.plain(builtinFmt),
      pack: packLookup.formatters.plain(packFmt),
    },
    llm: {
      builtin: story.formatters.llm(builtinFmt),
      pack: packLookup.formatters.llm(packFmt),
    },
    json: {
      builtin: story.formatters.json(builtinFmt),
      pack: packLookup.formatters.json(packFmt),
    },
    envelope: {
      builtin: envelopeOf(await builtinTool.execute(rt, toolParams)),
      pack: envelopeOf(await packTool.execute(rt, toolParams)),
    },
    condensed: {
      builtin: condensedText(
        await builtinTool.execute(rt, { ...toolParams, condensed: true }),
      ),
      pack: condensedText(
        await packTool.execute(rt, { ...toolParams, condensed: true }),
      ),
    },
  };
}

/**
 * Emit the not-found recovery block: both paths resolve the near-miss to no
 * entity, and their error contracts are compared. With
 * `resolveBuiltinNotFound` the comparison is the full contract (recovery +
 * crossDomain, past `lookupMany`'s reduction); otherwise it is the reduced
 * `LookupResult.errors` entry.
 */
function emitNotFoundCases<TDetailed, TFmtInput>(
  getRt: () => PragmaRuntime,
  lookup: PackParityLookupConfig<TDetailed, TFmtInput>,
  packLookup: LookupStory<Record<string, string>, Record<string, string>>,
): void {
  describe("lookup not-found recovery", () => {
    let builtinResult: LookupResult<TDetailed>;
    let packResult: LookupResult<Record<string, string>>;
    let builtinFull: PackParityNotFoundContract | undefined;

    beforeAll(async () => {
      const rt = getRt();
      builtinResult = await lookup.story.resolve(rt, [lookup.nearMiss], {});
      packResult = await packLookup.resolve(rt, [lookup.nearMiss], {});
      builtinFull = await lookup.resolveBuiltinNotFound?.(rt, lookup.nearMiss);
    });

    it("both paths resolve the near-miss to no entity", () => {
      expect(builtinResult.results).toEqual([]);
      expect(packResult.results).toEqual([]);
    });

    const reason = lookup.nearMissExpectedDivergence;
    const full = lookup.resolveBuiltinNotFound !== undefined;
    const title = notFoundTitle(reason, full);
    it(title, () => {
      if (builtinFull !== undefined) {
        assertNotFoundFull(
          builtinFull,
          packContractOf(packResult),
          reason,
          lookup.nearMissNormalize,
        );
        return;
      }
      assertNotFoundReduced(
        builtinResult.errors.at(0),
        packResult.errors.at(0),
        reason,
      );
    });
  });
}

/** The reduced pack contract reachable from a compiled pack's lookup. */
function packContractOf(
  result: LookupResult<Record<string, string>>,
): PackParityNotFoundContract {
  const error = result.errors.at(0);
  if (error === undefined) {
    throw new Error("pack path must report a not-found error");
  }
  return {
    code: error.code,
    message: error.message,
    suggestions: error.suggestions,
  };
}

/** Compare full built-in and (reduced) pack not-found contracts. */
function assertNotFoundFull(
  builtin: PackParityNotFoundContract,
  pack: PackParityNotFoundContract,
  reason: string | undefined,
  normalize: ((contract: PackParityNotFoundContract) => unknown) | undefined,
): void {
  if (reason === undefined) {
    expect(pack).toEqual(builtin);
    expect(builtin.suggestions?.length ?? 0).toBeGreaterThan(0);
    return;
  }
  // Pinned divergence: the full contracts differ (authored recovery copy).
  expect(pack).not.toEqual(builtin);
  expect(builtin.suggestions?.length ?? 0).toBeGreaterThan(0);
  if (normalize !== undefined) {
    // Confined: everything but the normalized-away delta is byte-identical.
    expect(normalize(pack)).toEqual(normalize(builtin));
  }
}

/** Compare reduced `LookupResult.errors` entries (the weaker mode). */
function assertNotFoundReduced(
  builtinError: LookupResult<unknown>["errors"][number] | undefined,
  packError: LookupResult<unknown>["errors"][number] | undefined,
  reason: string | undefined,
): void {
  if (builtinError === undefined || packError === undefined) {
    throw new Error("both paths must report a not-found error");
  }
  if (reason === undefined) {
    expect(packError).toEqual(builtinError);
    expect(builtinError.suggestions?.length ?? 0).toBeGreaterThan(0);
  } else {
    expect(packError).not.toEqual(builtinError);
  }
}

/** Title for the not-found comparison case. */
function notFoundTitle(reason: string | undefined, full: boolean): string {
  const scope = full ? "full error" : "error";
  if (reason === undefined) {
    return `not-found ${scope} is identical incl. ranked suggestions`;
  }
  return `not-found ${scope} diverges (allowlisted): ${reason}`;
}

/**
 * Emit one `it()` per surface: byte-equality when the surface is not
 * allowlisted, a pinned (optionally confined) divergence when it is.
 * `getSurfaces` is read lazily inside each case so the enclosing
 * `beforeAll` has populated it.
 */
function emitSurfaceCases(
  getSurfaces: () => Record<ParitySurface, SurfacePair>,
  divergences: ExpectedDivergences,
): void {
  for (const surface of PARITY_SURFACES) {
    const spec = specOf(divergences[surface]);
    const deep = surface === "envelope";
    const title = surfaceTitle(surface, spec);
    it(title, () => {
      assertPair(getSurfaces()[surface], deep, spec);
    });
  }
}

/** Title for one surface case, reflecting identical / pinned / confined. */
function surfaceTitle(
  surface: ParitySurface,
  spec: DivergenceSpec | undefined,
): string {
  if (spec === undefined) {
    return `${surface} is byte-identical`;
  }
  if (spec.normalize === undefined) {
    return `${surface} diverges (allowlisted, unconfined): ${spec.reason}`;
  }
  return `${surface} diverges (allowlisted, confined to the known delta): ${spec.reason}`;
}

/**
 * Assert one surface pair. With no spec, the pack must match the built-in
 * (deep for the envelope, byte for strings). With a spec, the pack must
 * diverge (the pinned burn-down assertion); when the spec carries a
 * `normalize`, the normalized forms must additionally be byte-equal, proving
 * the divergence is confined to exactly the normalized-away delta.
 */
function assertPair(
  pair: SurfacePair,
  deep: boolean,
  spec: DivergenceSpec | undefined,
): void {
  if (spec === undefined) {
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
  if (spec.normalize === undefined) {
    return;
  }
  const normalizedBuiltin = spec.normalize(pair.builtin);
  const normalizedPack = spec.normalize(pair.pack);
  if (deep) {
    expect(normalizedPack).toEqual(normalizedBuiltin);
  } else {
    expect(normalizedPack).toBe(normalizedBuiltin);
  }
}

/** Normalize an allowlist entry to a {@link DivergenceSpec}, or `undefined`. */
function specOf(
  entry: ExpectedDivergence | undefined,
): DivergenceSpec | undefined {
  if (entry === undefined) {
    return undefined;
  }
  if (typeof entry === "string") {
    return { reason: entry };
  }
  return entry;
}

/** The reason string of an allowlist entry, string or spec. */
function reasonOf(entry: ExpectedDivergence): string {
  return typeof entry === "string" ? entry : entry.reason;
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
  for (const entry of Object.values(config.list.expectedDivergences ?? {})) {
    reasons.add(reasonOf(entry));
  }
  const lookup = config.lookup;
  if (lookup !== undefined) {
    for (const entry of Object.values(lookup.expectedDivergences ?? {})) {
      reasons.add(reasonOf(entry));
    }
    for (const lookupCase of lookup.names) {
      for (const entry of Object.values(lookupCase.expectedDivergences ?? {})) {
        reasons.add(reasonOf(entry));
      }
    }
    if (lookup.nearMissExpectedDivergence !== undefined) {
      reasons.add(lookup.nearMissExpectedDivergence);
    }
  }
  return reasons;
}
