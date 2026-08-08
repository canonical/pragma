/**
 * Emit the tracked SDL — once, deliberately, and then exit.
 *
 * **Why this file exists.** `src/relay/schema.graphql` is a TRACKED artifact
 * that relay-compiler reads, but until this script there was no command that
 * produced it. Its only writer was a SIDE EFFECT of booting the graph server:
 * `graphql.ts` passes `sdlOutput: SDL_OUTPUT_PATH` to `createSchemaPlugin`,
 * so `bun run graph` — a long-lived dev server — silently rewrote a tracked
 * file on boot. Regenerating therefore meant starting a server and killing
 * it, which is not a thing anyone does on purpose, so nobody did. The file
 * rotted, undetected, for as long as it took the compiler to move under it.
 *
 * **It had rotted.** Three independent proofs, each checked against HEAD:
 *
 * 1. NO CANONICAL HEADER. `compose.ts` unconditionally prepends the seven
 *    `# ke-graphql · canonical SDL` / `# graphql-schema-spec` / `# provider`
 *    / `# mode` / `# validated-store` / `# revision` / `# prefixing` lines,
 *    and the contract's emission fixtures carry them
 *    (`packages/docsite/contract/src/__fixtures__/emittedProvider.sdl.txt`).
 *    The tracked file had no header at all — it opened on the `@defer`
 *    directive's description. It could not have come from this compiler.
 * 2. A DESCRIPTION THE COMPILER NO LONGER EMITS. `wireRelay.ts` emits
 *    `"Relay node resolution by absolute IRI."`. The tracked file said
 *    `"Relay node resolution by prefixed-URI global ID."` — a string that
 *    exists NOWHERE in `packages/runtime/ke-graphql/src`. It was left over
 *    from a compiler that no longer exists.
 * 3. LINE COUNT. Tracked was 4609 lines; the captured second-root fixture
 *    `schemaWithSecondRoot.sdl.txt` was 4698. Two artifacts of the same
 *    schema, 89 lines apart.
 *
 * **So this script is now the single deliberate writer.** It boots the
 * backend exactly as the graph server does — same store, same sources, same
 * compiler, no special path — and exits the moment the SDL is on disk. The
 * emission is still `graphql.ts`'s; this file only makes it reachable
 * without running a server, so that "regenerate the schema" is a command
 * (`bun run graphql:sdl`) rather than a piece of folklore.
 *
 * **Requires both source roots.** The refs cache and the semantics tree:
 *
 * ```
 * PRAGMA_REFS_DIR=$HOME/.cache/pragma/refs/@canonical \
 * PRAGMA_SEM_DIR=/workspace/freefold-p/semantics \
 * bun run graphql:sdl
 * ```
 *
 * `collectTtlSources` throws when the refs root is absent, so a missing
 * cache fails loudly. The SEMANTICS root does not: it is skipped silently
 * when absent, by design, so the four shipped lenses still boot without it
 * — which means running this WITHOUT `PRAGMA_SEM_DIR` emits the first-root
 * schema over the tracked file. That is exactly how the pre-second-root
 * fixture is captured, and exactly how you would corrupt the tracked SDL by
 * accident. Check the source count this prints before committing the diff.
 *
 * **Exits explicitly.** The Oxigraph WASM store keeps the event loop alive,
 * so a natural end-of-module would hang the process after the write has
 * already landed. The exit code is the artifact's: 0 once the SDL is
 * written, 1 with the backend's own actionable message if the boot fails.
 */

import { getGraphqlBackend } from "./graphql.js";

const backend = await getGraphqlBackend().catch((error: unknown): never => {
  console.error(
    "[emit-sdl] the GraphQL backend failed to boot:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});

console.info(
  `[emit-sdl] SDL emitted (${backend.api.diagnostics.length} diagnostics)`,
);

process.exit(0);
