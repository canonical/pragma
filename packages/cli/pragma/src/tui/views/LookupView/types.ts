import type { RenderLookupOptions } from "../../../domains/shared/contracts.js";

export interface LookupViewProps<T> {
  /** Lookup results to render as stacked cards. */
  readonly results: readonly T[];
  /** Lookup errors to display after result cards. */
  readonly errors: readonly {
    readonly query: string;
    readonly code: string;
    readonly message: string;
  }[];
  /** Lookup rendering options (title, fields, sections, overrides). */
  readonly options: RenderLookupOptions<T>;
  /** Domain name for card coloring. */
  readonly domain: string;
}
