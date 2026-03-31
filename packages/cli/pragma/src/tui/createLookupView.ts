import { createElement } from "react";
import type { RenderLookupOptions } from "../domains/shared/contracts.js";
import { LookupView } from "./views/index.js";

/**
 * Create a LookupView React element with proper generic type inference.
 *
 * Wraps `createElement(LookupView, props)` to preserve the generic `T`
 * that `createElement` loses when called directly with a generic
 * component function.
 *
 * @param props - LookupView props with typed results and options.
 * @returns A React element ready for Ink rendering.
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
}): React.ReactElement {
  // biome-ignore lint/suspicious/noExplicitAny: generic erasure at createElement boundary
  return createElement(LookupView as React.FC<any>, props);
}
