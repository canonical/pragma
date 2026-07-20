/**
 * Render kernel barrel — the pure, layout-only output layer.
 *
 * The projectors compose these: the generic renderers and formatter selector
 * for text output, the disclosure resolver for progressive detail, the machine
 * envelope for `--format json` / MCP, and the chunked stdout writer.
 */

export { compactUri } from "./compactUri.js";
export type {
  ColumnDef,
  LookupField,
  LookupSectionOverride,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
  SectionKind,
} from "./contracts.js";
export { DETAIL_LEVELS, resolveDetail } from "./disclosure.js";
export type { ErrorEnvelope, SuccessEnvelope } from "./envelope.js";
export { errorEnvelope, successEnvelope } from "./envelope.js";
export { selectFormatter } from "./formatters.js";
export { DEFAULT_PREFIX_MAP } from "./prefixes.js";
export {
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "./renderers.js";
export { writeChunked, writeStdout } from "./writeStdout.js";
