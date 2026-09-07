/**
 * `@canonical/prism-contract` — the data contract between a Prism
 * documentation site and whatever GraphQL backend serves it.
 *
 * The package states the minimal schema surface a provider must offer, as SDL,
 * and answers one question about any candidate provider: does it satisfy that
 * contract? The answer is semantic subsumption, not a diff — a conformant
 * provider is a strict superset of the contract and always differs textually.
 *
 * @module prism-contract
 */

export * from "./lib/index.js";
