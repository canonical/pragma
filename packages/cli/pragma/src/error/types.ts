import type { ERROR_CODES } from "./constants.js";

type ErrorCode = (typeof ERROR_CODES)[number];

interface Recovery {
  message: string;
  cli?: string;
  mcp?: { tool: string; params?: Record<string, unknown> };
}

interface PragmaErrorData {
  code: ErrorCode;
  message: string;
  entity?: { type: string; name: string };
  suggestions?: string[];
  recovery?: Recovery;
  filters?: Record<string, string>;
  validOptions?: string[];
}

export type { ErrorCode, PragmaErrorData, Recovery };
