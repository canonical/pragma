import type { ErrorCode } from "../error/types.js";

const EXIT_CODES: Record<ErrorCode, number> = {
  ENTITY_NOT_FOUND: 1,
  EMPTY_RESULTS: 2,
  INVALID_INPUT: 3,
  AMBIGUOUS_INPUT: 3,
  CONFIG_ERROR: 4,
  STORE_ERROR: 5,
  INTERNAL_ERROR: 127,
};

export { EXIT_CODES };
