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
import getComponent from "../component/getComponent.js";
import listComponents from "../component/listComponents.js";
import { getModifier, listModifiers } from "../modifier/operations.js";
import {
  getStandard,
  listCategories,
  listStandards,
} from "../standard/operations.js";
import { listTiers } from "../tier/operations.js";
import { getToken, listTokens } from "../token/operations.js";
import type {
  AnatomyNode,
  AnatomyTree,
  CategorySummary,
  CodeBlock,
  ComponentDetailed,
  ComponentSummary,
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

// ComponentSummary
expectTypeOf<ComponentSummary["uri"]>().toEqualTypeOf<URI>();
expectTypeOf<ComponentSummary["name"]>().toBeString();
expectTypeOf<ComponentSummary["tier"]>().toBeString();
expectTypeOf<ComponentSummary["modifiers"]>().toEqualTypeOf<
  readonly string[]
>();
expectTypeOf<ComponentSummary["nodeCount"]>().toBeNumber();
expectTypeOf<ComponentSummary["tokenCount"]>().toBeNumber();

// ComponentDetailed extends ComponentSummary
expectTypeOf<ComponentDetailed>().toMatchTypeOf<ComponentSummary>();
expectTypeOf<
  ComponentDetailed["anatomy"]
>().toEqualTypeOf<AnatomyTree | null>();
expectTypeOf<ComponentDetailed["tokens"]>().toEqualTypeOf<
  readonly TokenRef[]
>();
expectTypeOf<ComponentDetailed["standards"]>().toEqualTypeOf<
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

expectTypeOf(listComponents).returns.resolves.toEqualTypeOf<
  ComponentSummary[]
>();
expectTypeOf(getComponent).returns.resolves.toEqualTypeOf<ComponentDetailed>();
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
