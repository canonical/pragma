/**
 * Cross-cutting type re-exports for the public barrel.
 *
 * The kernel keeps its authoritative type definitions co-located with the
 * modules that own them (spec grammar, config, error, runtime); this file is
 * the single import hop the types-only `index.ts` barrel re-exports from, so
 * the public surface never reaches into deep module paths. It grows one
 * section per PR as each kernel layer lands.
 */

export type { DetailLevel, OutputFormat } from "./constants.js";
