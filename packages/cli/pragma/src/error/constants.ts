const ERROR_CODES = [
  "ENTITY_NOT_FOUND",
  "EMPTY_RESULTS",
  "INVALID_INPUT",
  "AMBIGUOUS_INPUT",
  "STORE_ERROR",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
] as const;

type ErrorCode = (typeof ERROR_CODES)[number];

export { ERROR_CODES };
export type { ErrorCode };
