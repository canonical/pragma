import { createElement } from "react";
import type { ColumnDef } from "../domains/shared/contracts.js";
import { ListView } from "./views/index.js";

/**
 * Create a ListView React element with proper generic type inference.
 *
 * Wraps `createElement(ListView, props)` to preserve the generic `T`
 * that `createElement` loses when called directly with a generic
 * component function.
 *
 * @param props - ListView props with typed items and columns.
 * @returns A React element ready for Ink rendering.
 */
export default function createListView<T>(props: {
  readonly heading: string;
  readonly domain: string;
  readonly items: readonly T[];
  readonly columns: readonly ColumnDef<T>[];
  readonly prefixes?: Readonly<Record<string, string>>;
}): React.ReactElement {
  // biome-ignore lint/suspicious/noExplicitAny: generic erasure at createElement boundary
  return createElement(ListView as React.FC<any>, props);
}
