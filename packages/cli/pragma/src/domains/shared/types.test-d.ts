/**
 * TB.03 — Compile-time type tests.
 *
 * Asserts that shared operation return types match TB.01 contracts.
 * Checked by `tsc --noEmit`, not executed at runtime.
 *
 * @see B.24.TYPE_BOUNDARIES
 */

import type { Store, URI } from "@canonical/ke";
import { expectTypeOf } from "expect-type";
import { getBlock, listBlocks } from "../block/operations/index.js";
import { getModifier, listModifiers } from "../modifier/operations/index.js";
import {
  getStandard,
  listCategories,
  listStandards,
} from "../standard/operations/index.js";
import { listTiers } from "../tier/operations/index.js";
import { getToken, listTokens } from "../token/operations/index.js";
import type {
  AnatomyNode,
  AnatomyTree,
  BlockDetailed,
  BlockSummary,
  CategorySummary,
  CodeBlock,
  FilterConfig,
  ModifierFamily,
  StandardDetailed,
  StandardRef,
  StandardSummary,
  TierEntry,
  TokenDetailed,
  TokenRef,
  TokenSummary,
} from "./types.js";

// =============================================================================
// TB.01 — Type structure assertions
// =============================================================================

// BlockSummary
expectTypeOf<BlockSummary["uri"]>().toEqualTypeOf<URI>();
expectTypeOf<BlockSummary["name"]>().toBeString();
expectTypeOf<BlockSummary["tier"]>().toBeString();
expectTypeOf<BlockSummary["modifiers"]>().toEqualTypeOf<readonly string[]>();
expectTypeOf<BlockSummary["nodeCount"]>().toBeNumber();
expectTypeOf<BlockSummary["tokenCount"]>().toBeNumber();

// BlockDetailed extends BlockSummary
expectTypeOf<BlockDetailed>().toMatchTypeOf<BlockSummary>();
expectTypeOf<BlockDetailed["anatomy"]>().toEqualTypeOf<AnatomyTree | null>();
expectTypeOf<BlockDetailed["tokens"]>().toEqualTypeOf<readonly TokenRef[]>();
expectTypeOf<BlockDetailed["standards"]>().toEqualTypeOf<
  readonly StandardRef[]
>();

// AnatomyNode
expectTypeOf<AnatomyNode["type"]>().toEqualTypeOf<"named" | "anonymous">();
expectTypeOf<AnatomyNode["children"]>().toEqualTypeOf<readonly AnatomyNode[]>();

// StandardSummary
expectTypeOf<StandardSummary["uri"]>().toEqualTypeOf<URI>();
expectTypeOf<StandardSummary["name"]>().toBeString();
expectTypeOf<StandardSummary["category"]>().toBeString();

// StandardDetailed extends StandardSummary
expectTypeOf<StandardDetailed>().toMatchTypeOf<StandardSummary>();
expectTypeOf<StandardDetailed["dos"]>().toEqualTypeOf<readonly CodeBlock[]>();
expectTypeOf<StandardDetailed["donts"]>().toEqualTypeOf<readonly CodeBlock[]>();

// CodeBlock
expectTypeOf<CodeBlock["language"]>().toBeString();
expectTypeOf<CodeBlock["code"]>().toBeString();

// CategorySummary
expectTypeOf<CategorySummary["name"]>().toBeString();
expectTypeOf<CategorySummary["standardCount"]>().toBeNumber();

// ModifierFamily
expectTypeOf<ModifierFamily["uri"]>().toEqualTypeOf<URI>();
expectTypeOf<ModifierFamily["values"]>().toEqualTypeOf<readonly string[]>();

// TokenSummary
expectTypeOf<TokenSummary["uri"]>().toEqualTypeOf<URI>();
expectTypeOf<TokenSummary["name"]>().toBeString();
expectTypeOf<TokenSummary["category"]>().toBeString();

// TokenDetailed extends TokenSummary
expectTypeOf<TokenDetailed>().toMatchTypeOf<TokenSummary>();

// TierEntry
expectTypeOf<TierEntry["uri"]>().toEqualTypeOf<URI>();
expectTypeOf<TierEntry["path"]>().toBeString();
expectTypeOf<TierEntry["depth"]>().toBeNumber();

// FilterConfig
expectTypeOf<FilterConfig["channel"]>().toEqualTypeOf<
  "normal" | "experimental" | "prerelease"
>();

// =============================================================================
// TB.03 — Operation return type assertions
// =============================================================================

declare const store: Store;
declare const filters: FilterConfig;

expectTypeOf(listBlocks).returns.resolves.toEqualTypeOf<BlockSummary[]>();
expectTypeOf(getBlock).returns.resolves.toEqualTypeOf<BlockDetailed>();
expectTypeOf(listStandards).returns.resolves.toEqualTypeOf<StandardSummary[]>();
expectTypeOf(getStandard).returns.resolves.toEqualTypeOf<StandardDetailed>();
expectTypeOf(listCategories).returns.resolves.toEqualTypeOf<
  CategorySummary[]
>();
expectTypeOf(listModifiers).returns.resolves.toEqualTypeOf<ModifierFamily[]>();
expectTypeOf(getModifier).returns.resolves.toEqualTypeOf<ModifierFamily>();
expectTypeOf(listTokens).returns.resolves.toEqualTypeOf<TokenSummary[]>();
expectTypeOf(getToken).returns.resolves.toEqualTypeOf<TokenDetailed>();
expectTypeOf(listTiers).returns.resolves.toEqualTypeOf<TierEntry[]>();
