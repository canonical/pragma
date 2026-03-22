/** @module Doctor domain -- environment health checks via `pragma doctor`. */
export { doctorCommand } from "./commands/index.js";
export { specs as mcpSpecs } from "./mcp/index.js";
export type {
  CheckContext,
  CheckResult,
  DoctorData,
} from "./operations/index.js";
export { runChecks } from "./operations/index.js";
