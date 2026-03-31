import type { RenderLookupOptions } from "../domains/shared/contracts.js";
import { LookupView } from "./views/index.js";

/**
 * Create a LookupView string output with proper generic type inference.
 *
 * Wraps the LookupView function call to preserve the generic `T` at
 * the call site. Domain commands call this from plain `.ts` files
 * without needing JSX or React.
 *
 * @param props - LookupView props with typed results and options.
 * @returns A chalk-styled string ready for stdout.
 */
export default function createLookupView<T>(props: {
  readonly results: readonly T[];
  readonly errors: readonly {
    readonly query: string;
    readonly code: string;
    readonly message: string;
  }[];
  readonly options: RenderLookupOptions<T>;
  readonly domain: string;
}): string {
  // biome-ignore lint/suspicious/noExplicitAny: generic erasure at function boundary
  return (LookupView as (props: any) => string)(props);
}
