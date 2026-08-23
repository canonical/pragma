/**
 * The batched data-loading domain: the three per-request DataLoaders
 * (entity, class listing, reverse assertions), all keyed on absolute IRIs,
 * plus the prefixed-URI ↔ full-IRI conversions kept for the edges (see
 * ./uris.ts).
 *
 * @module dataloader
 */

export { default as createEntityLoader } from "./createEntityLoader.js";
export { default as createInverseLoader } from "./createInverseLoader.js";
export { default as createListLoader } from "./createListLoader.js";
export { toFull, toPrefixed } from "./uris.js";
