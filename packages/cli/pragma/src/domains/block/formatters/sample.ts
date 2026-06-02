/**
 * Sample formatter for the block domain.
 *
 * Delegates to the shared factory, rendering each item via the
 * existing block lookup formatter with all aspects enabled.
 */

import createSampleFormatters from "../../shared/sampleFormatters.js";
import type { BlockDetailed } from "../../shared/types/index.js";
import lookupFormatters from "./lookup.js";

const ALL_ASPECTS = {
  anatomy: true,
  modifiers: true,
  tokens: true,
  implementations: true,
} as const;

export default createSampleFormatters<BlockDetailed>("blocks", (block, mode) =>
  lookupFormatters[mode]({ block, detailed: true, aspects: ALL_ASPECTS }),
);
