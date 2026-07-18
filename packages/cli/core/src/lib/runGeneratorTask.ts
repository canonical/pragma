/**
 * Re-export shim: the UI-free execution core moved to `@canonical/summon-core`.
 *
 * The implementation now lives below both binaries in summon-core (the shared
 * seam the byte-equality guarantee rests on). cli-core re-exports it so the
 * summon bin and the old pragma shell keep compiling unchanged; this shim is
 * removed with cli-core in PR8.
 */

export type { RunGeneratorTaskOptions } from "@canonical/summon-core";
export { runGeneratorTask as default } from "@canonical/summon-core";
