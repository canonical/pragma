import type { TokenSummary } from "../shared/types/index.js";

export interface TokenListResolution {
  readonly params: { category?: string };
  readonly items: readonly TokenSummary[];
}
