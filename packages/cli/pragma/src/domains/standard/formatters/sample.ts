/**
 * Sample formatter for the standard domain.
 *
 * Delegates to the shared factory, rendering each item via the
 * existing standard lookup formatter.
 */

import createSampleFormatters from "../../shared/sampleFormatters.js";
import type { StandardDetailed } from "../../shared/types/index.js";
import lookupFormatters from "./lookup.js";

export default createSampleFormatters<StandardDetailed>(
  "standards",
  (standard, mode) => lookupFormatters[mode]({ standard, detailed: true }),
);
