import type { ErrorCode, PragmaErrorData, Recovery } from "./types.js";

/**
 * Structured error for all pragma operations.
 *
 * Carries a machine-readable {@link ErrorCode}, optional recovery hints, and
 * contextual metadata (suggestions, valid options, active filters) so the CLI
 * and MCP projectors can render one actionable diagnostic from one throw. The
 * effect seam reads throw these directly; mutations surface `TaskError`s that
 * the dispatcher wraps.
 */
class PragmaError extends Error {
  /** Machine-readable error classification. */
  readonly code: ErrorCode;
  /** Entity that triggered the error (type + name), if applicable. */
  readonly entity: PragmaErrorData["entity"];
  /** Fuzzy-matched alternative names the user may have intended. */
  readonly suggestions: string[];
  /** Structured recovery hint with optional CLI command or MCP tool call. */
  readonly recovery: Recovery | undefined;
  /** Active filters at the time of the error, for diagnostic context. */
  readonly filters: Record<string, string> | undefined;
  /** Enumerated valid options when input was rejected. */
  readonly validOptions: string[] | undefined;

  /**
   * @param data - Structured error payload.
   */
  constructor(data: PragmaErrorData) {
    super(data.message);
    this.name = "PragmaError";
    this.code = data.code;
    this.entity = data.entity;
    this.suggestions = data.suggestions ?? [];
    this.recovery = data.recovery;
    this.filters = data.filters;
    this.validOptions = data.validOptions;
  }

  /**
   * Factory: entity not found by name.
   *
   * @param entityType - Kind of entity (e.g. `"block"`, `"token"`).
   * @param entityName - Name the user supplied.
   * @param opts - Optional suggestions and recovery hint.
   * @returns PragmaError with code `ENTITY_NOT_FOUND`.
   */
  static notFound(
    entityType: string,
    entityName: string,
    opts: { suggestions?: string[]; recovery?: Recovery } = {},
  ): PragmaError {
    return new PragmaError({
      code: "ENTITY_NOT_FOUND",
      message: `${entityType} "${entityName}" not found.`,
      entity: { type: entityType, name: entityName },
      suggestions: opts.suggestions,
      recovery: opts.recovery,
    });
  }

  /**
   * Factory: query returned zero results.
   *
   * @param entityType - Kind of entity being listed.
   * @param opts - Optional message, active filters, and recovery hint.
   * @returns PragmaError with code `EMPTY_RESULTS`.
   */
  static emptyResults(
    entityType: string,
    opts: {
      message?: string;
      filters?: Record<string, string>;
      recovery?: Recovery;
      validOptions?: string[];
    } = {},
  ): PragmaError {
    return new PragmaError({
      code: "EMPTY_RESULTS",
      message: opts.message ?? `No ${entityType}s found.`,
      filters: opts.filters,
      recovery: opts.recovery,
      validOptions: opts.validOptions,
    });
  }

  /**
   * Factory: user-supplied input is invalid.
   *
   * @param field - Name of the invalid field or argument.
   * @param value - The rejected value.
   * @param opts - Optional valid alternatives and recovery hint.
   * @returns PragmaError with code `INVALID_INPUT`.
   */
  static invalidInput(
    field: string,
    value: string,
    opts: { validOptions?: string[]; recovery?: Recovery } = {},
  ): PragmaError {
    return new PragmaError({
      code: "INVALID_INPUT",
      message: `Invalid ${field} "${value}".`,
      validOptions: opts.validOptions,
      recovery: opts.recovery,
    });
  }

  /**
   * Factory: an unknown noun/verb was entered.
   *
   * @param verb - The unrecognized command token.
   * @param opts - Optional suggestions and recovery hint.
   * @returns PragmaError with code `UNKNOWN_VERB`.
   */
  static unknownVerb(
    verb: string,
    opts: { suggestions?: string[]; recovery?: Recovery } = {},
  ): PragmaError {
    return new PragmaError({
      code: "UNKNOWN_VERB",
      message: `Unknown command "${verb}".`,
      suggestions: opts.suggestions,
      recovery: opts.recovery,
    });
  }

  /**
   * Factory: the knowledge-engine store could not be reached.
   *
   * Its own exit code (3) so scripts can distinguish an unavailable store from
   * an ordinary runtime failure.
   *
   * @param reason - Human-readable failure description.
   * @param opts - Optional recovery hint.
   * @returns PragmaError with code `STORE_UNAVAILABLE`.
   */
  static storeUnavailable(
    reason: string,
    opts: { recovery?: Recovery } = {},
  ): PragmaError {
    return new PragmaError({
      code: "STORE_UNAVAILABLE",
      message: `Store unavailable. ${reason}`,
      recovery: opts.recovery,
    });
  }

  /**
   * Factory: configuration file is invalid or contains bad values.
   *
   * @param reason - Human-readable description of the config problem.
   * @param opts - Optional valid alternatives and recovery hint.
   * @returns PragmaError with code `CONFIG_ERROR`.
   */
  static configError(
    reason: string,
    opts: { validOptions?: string[]; recovery?: Recovery } = {},
  ): PragmaError {
    return new PragmaError({
      code: "CONFIG_ERROR",
      message: reason,
      validOptions: opts.validOptions,
      recovery: opts.recovery,
    });
  }

  /**
   * Factory: unexpected internal failure (a bug).
   *
   * @param reason - Description of the internal error.
   * @returns PragmaError with code `INTERNAL_ERROR` and a "please report" hint.
   */
  static internalError(reason: string): PragmaError {
    return new PragmaError({
      code: "INTERNAL_ERROR",
      message: `Internal error: ${reason}`,
      recovery: { message: "Please report this issue." },
    });
  }
}

export { PragmaError };
