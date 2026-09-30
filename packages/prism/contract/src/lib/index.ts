/**
 * The contract check's public surface: the shipped SDL, the predicate, and the
 * assertion built on it.
 *
 * @module lib
 */

export { readContractSdl } from "./contractSdl.js";
export {
  assertSatisfiesContract,
  satisfiesContract,
} from "./satisfiesContract.js";
export type {
  AssertSatisfiesContractOptions,
  ContractResult,
  ContractViolation,
  ContractViolationCode,
  SatisfiesContractOptions,
} from "./types.js";
