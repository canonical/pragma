/**
 * The `__store-probe` diagnostic — boot the embedded pack and report a count.
 *
 * Its whole reason to exist is the compiled binary: it exercises the full
 * store-boot path (oxigraph WASM load, n-quads cache load, `compileFromExtraction`,
 * a SPARQL count) so a spawned-binary smoke test can prove the WASM and the
 * embedded pack survive `bun build --compile`. A silent store-boot failure in
 * the standalone binary is the one failure vitest's in-process suite cannot
 * catch, so this is the guard. Storeless code never imports it — the bin
 * fast-paths it behind a dynamic import.
 */

/**
 * Boot the embedded pack and return a one-line JSON diagnostic.
 *
 * @returns `{ ok, entities, triples }` as compact JSON.
 * @note Impure — materializes the embedded pack and boots a store.
 */
export async function runStoreProbe(): Promise<string> {
  const [{ materializeEmbeddedPack }, { readPack }] = await Promise.all([
    import("./graphpack/embedded.js"),
    import("./graphpack/read.js"),
  ]);
  const session = await readPack(materializeEmbeddedPack());
  try {
    const result = await session.store.query(
      "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }" as never,
    );
    const triples =
      result.type === "select" ? (result.bindings[0]?.n ?? "0") : "0";
    return JSON.stringify({
      ok: true,
      entities: session.index.entities.length,
      triples,
    });
  } finally {
    session.store.dispose();
  }
}
