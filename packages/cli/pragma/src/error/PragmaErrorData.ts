import type { ErrorCode } from "./constants.js";

interface PragmaErrorData {
  code: ErrorCode;
  message: string;
  entity?: { type: string; name: string };
  suggestions?: string[];
  recovery?: string | string[];
  filters?: Record<string, string>;
  validOptions?: string[];
}

export type { PragmaErrorData };
