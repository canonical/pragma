import type { TokenSummary } from "../shared/types.js";

export interface TokenListResolution {
  readonly params: { category?: string };
  readonly items: readonly TokenSummary[];
}
