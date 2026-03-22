/** All recognized pragma error codes as a const tuple. */
const ERROR_CODES = [
  "ENTITY_NOT_FOUND",
  "EMPTY_RESULTS",
  "INVALID_INPUT",
  "AMBIGUOUS_INPUT",
  "STORE_ERROR",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
] as const;

export { ERROR_CODES };
