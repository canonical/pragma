import type { ERROR_CODES } from "./constants.js";

type ErrorCode = (typeof ERROR_CODES)[number];

interface PragmaErrorData {
  code: ErrorCode;
  message: string;
  entity?: { type: string; name: string };
  suggestions?: string[];
  recovery?: string | string[];
  filters?: Record<string, string>;
  validOptions?: string[];
}

export type { ErrorCode, PragmaErrorData };
