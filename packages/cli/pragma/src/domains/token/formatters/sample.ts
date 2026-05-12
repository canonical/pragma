/**
 * Sample formatter for the token domain.
 *
 * Delegates to the shared factory, rendering each item via the
 * existing token lookup formatter with full detail.
 */

import createSampleFormatters from "../../shared/sampleFormatters.js";
import type { TokenDetailed } from "../../shared/types/index.js";
import createLookupFormatters from "./lookup.js";

const lookupFmt = createLookupFormatters({ detailed: true });

export default createSampleFormatters<TokenDetailed>("tokens", (token, mode) =>
  lookupFmt[mode](token),
);
