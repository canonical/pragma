/**
 * Block domain types.
 *
 * Reused across block commands, formatters, and aspect resolution.
 */

import type { ListContract } from "../shared/contracts.js";
import type { BlockDetailed, BlockSummary } from "../shared/types.js";

/** Flags controlling which detail aspects are included in block output. */
export interface AspectFlags {
  readonly anatomy: boolean;
  readonly modifiers: boolean;
  readonly tokens: boolean;
  readonly implementations: boolean;
}

export interface BlockListDigest extends BlockSummary {
  readonly summary: string | null;
  readonly implementationPaths: readonly {
    framework: string;
    path: string;
  }[];
}

export type BlockListContract = ListContract<
  BlockSummary,
  BlockListDigest,
  BlockDetailed
>;
