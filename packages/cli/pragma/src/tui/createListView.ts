import type { ColumnDef } from "../domains/shared/contracts.js";
import { ListView } from "./views/index.js";

/**
 * Create a ListView string output with proper generic type inference.
 *
 * Wraps the ListView function call to preserve the generic `T` at
 * the call site. Domain commands call this from plain `.ts` files
 * without needing JSX or React.
 *
 * @param props - ListView props with typed items and columns.
 * @returns A chalk-styled string ready for stdout.
 */
export default function createListView<T>(props: {
  readonly heading: string;
  readonly domain: string;
  readonly items: readonly T[];
  readonly columns: readonly ColumnDef<T>[];
  readonly prefixes?: Readonly<Record<string, string>>;
}): string {
  // biome-ignore lint/suspicious/noExplicitAny: generic erasure at function boundary
  return (ListView as (props: any) => string)(props);
}
