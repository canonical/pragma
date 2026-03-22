import type { ErrorCode, PragmaErrorData, Recovery } from "./types.js";

class PragmaError extends Error {
  readonly code: ErrorCode;
  readonly entity: PragmaErrorData["entity"];
  readonly suggestions: string[];
  readonly recovery: Recovery | undefined;
  readonly filters: Record<string, string> | undefined;
  readonly validOptions: string[] | undefined;

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

  static notFound(
    entityType: string,
    entityName: string,
    opts: {
      suggestions?: string[];
      recovery?: Recovery;
    } = {},
  ): PragmaError {
    return new PragmaError({
      code: "ENTITY_NOT_FOUND",
      message: `${entityType} "${entityName}" not found.`,
      entity: { type: entityType, name: entityName },
      suggestions: opts.suggestions,
      recovery: opts.recovery,
    });
  }

  static emptyResults(
    entityType: string,
    opts: {
      filters?: Record<string, string>;
      recovery?: Recovery;
    } = {},
  ): PragmaError {
    return new PragmaError({
      code: "EMPTY_RESULTS",
      message: `No ${entityType}s found.`,
      filters: opts.filters,
      recovery: opts.recovery,
    });
  }

  static invalidInput(
    field: string,
    value: string,
    opts: {
      validOptions?: string[];
      recovery?: Recovery;
    } = {},
  ): PragmaError {
    return new PragmaError({
      code: "INVALID_INPUT",
      message: `Invalid ${field} "${value}".`,
      validOptions: opts.validOptions,
      recovery: opts.recovery,
    });
  }

  static storeError(
    reason: string,
    opts: { recovery?: Recovery } = {},
  ): PragmaError {
    return new PragmaError({
      code: "STORE_ERROR",
      message: `Failed to initialize store. ${reason}`,
      recovery: opts.recovery,
    });
  }

  static configError(
    reason: string,
    opts: {
      validOptions?: string[];
      recovery?: Recovery;
    } = {},
  ): PragmaError {
    return new PragmaError({
      code: "CONFIG_ERROR",
      message: reason,
      validOptions: opts.validOptions,
      recovery: opts.recovery,
    });
  }

  static internalError(reason: string): PragmaError {
    return new PragmaError({
      code: "INTERNAL_ERROR",
      message: `Internal error: ${reason}`,
      recovery: { message: "Please report this issue." },
    });
  }
}

export { PragmaError };
