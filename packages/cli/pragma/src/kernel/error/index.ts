/**
 * Error kernel barrel — the structured error model and its renderers.
 *
 * The projectors import `PragmaError` and the renderers from here; the
 * recovery invariant and the serializer are exported for the seams that build
 * and marshal errors.
 */

export { ERROR_CODES } from "./constants.js";
export { PragmaError } from "./PragmaError.js";
export { assertRecoveryCli, cliRecovery } from "./recovery.js";
export {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";
export { serializeError } from "./serialize.js";
export type {
  ErrorCode,
  ErrorPayload,
  PragmaErrorData,
  Recovery,
} from "./types.js";
