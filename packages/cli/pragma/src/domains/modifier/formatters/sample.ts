/**
 * Sample formatter for the modifier domain.
 *
 * Delegates to the shared factory, rendering each item via the
 * existing modifier lookup formatter.
 */

import createSampleFormatters from "../../shared/sampleFormatters.js";
import type { ModifierFamily } from "../../shared/types/index.js";
import lookupFormatters from "./lookup.js";

export default createSampleFormatters<ModifierFamily>(
  "modifiers",
  (family, mode) => lookupFormatters[mode](family),
);
