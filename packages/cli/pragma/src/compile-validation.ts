/**
 * E1 WASM Embedding Validation — Compiled Binary Entry Point
 *
 * This file is compiled via `bun build --compile` and exercised as a
 * standalone executable. It validates that the Oxigraph WASM module loads
 * and queries correctly when embedded in a compiled Bun binary.
 *
 * Tests exercised:
 *   1. Dynamic import of @canonical/ke (triggers WASM loading)
 *   2. createStore() with file sources
 *   3. SPARQL SELECT query with prefix expansion
 *   4. sparql tagged template with branded URI interpolation
 *   5. ASK query
 *   6. CONSTRUCT query
 *   7. Cache round-trip (write + re-load)
 *
 * @note This file is impure — it writes temp files and reads from disk.
 * It is a build validation program, not a library module.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function run() {
  const start = performance.now();

  // --- Setup temp directory with TTL data ---
  const workDir = join(tmpdir(), `e1-validate-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  const ttlPath = join(workDir, "people.ttl");
  writeFileSync(
    ttlPath,
    `
@prefix schema: <http://schema.org/> .
@prefix ex: <http://example.org/> .

ex:alice a schema:Person ;
  schema:name "Alice" ;
  schema:age 30 ;
  schema:email "alice@example.org" .

ex:bob a schema:Person ;
  schema:name "Bob" ;
  schema:age 25 ;
  schema:knows ex:alice .

ex:charlie a schema:Person ;
  schema:name "Charlie" ;
  schema:age 35 ;
  schema:knows ex:alice, ex:bob .
`,
  );

  const cachePath = join(workDir, ".cache", "store.nq");

  // --- 1. Load ke (triggers WASM) ---
  console.log("[validate] Loading @canonical/ke (triggers WASM)...");
  const wasmStart = performance.now();
  const { createStore, sparql, createNamespace } = await import(
    "@canonical/ke"
  );
  console.log(
    `[validate] WASM loaded in ${(performance.now() - wasmStart).toFixed(1)}ms`,
  );

  // --- 2. createStore from file sources ---
  console.log("[validate] Creating store from file sources...");
  const storeStart = performance.now();
  const store = await createStore({
    sources: [ttlPath],
    prefixes: {
      schema: "http://schema.org/",
      ex: "http://example.org/",
    },
    cache: cachePath,
  });
  console.log(
    `[validate] Store created in ${(performance.now() - storeStart).toFixed(1)}ms`,
  );

  // --- 3. SPARQL SELECT ---
  console.log("[validate] Running SPARQL SELECT...");
  const selectResult = await store.query(
    sparql`SELECT ?name ?age WHERE { ?p a schema:Person ; schema:name ?name ; schema:age ?age . } ORDER BY ?name`,
  );

  if (selectResult.type !== "select") {
    throw new Error(`Expected select result, got ${selectResult.type}`);
  }
  console.log(
    `[validate] Query returned ${selectResult.bindings.length} bindings`,
  );
  for (const b of selectResult.bindings) {
    console.log(
      `  name=${JSON.stringify(b.name)} age=${JSON.stringify(b.age)}`,
    );
  }

  if (selectResult.bindings.length !== 3) {
    throw new Error(`Expected 3 bindings, got ${selectResult.bindings.length}`);
  }

  // --- 4. Branded URI interpolation ---
  console.log("[validate] Testing branded URI interpolation...");
  const ex = createNamespace("http://example.org/");
  const aliceURI = ex("alice");
  const knowsResult = await store.query(
    sparql`SELECT ?friend WHERE { ${aliceURI} schema:knows ?friend . }`,
  );
  if (knowsResult.type !== "select") {
    throw new Error(`Expected select result, got ${knowsResult.type}`);
  }
  console.log(
    `[validate] Branded URI query: ${knowsResult.bindings.length} bindings`,
  );

  // --- 5. ASK query ---
  console.log("[validate] Testing ASK query...");
  const askResult = await store.query(sparql`ASK { ex:alice a schema:Person }`);
  if (askResult.type !== "ask") {
    throw new Error(`Expected ask result, got ${askResult.type}`);
  }
  if (!askResult.result) {
    throw new Error("ASK should return true");
  }
  console.log(`[validate] ASK result: ${askResult.result}`);

  // --- 6. CONSTRUCT query ---
  console.log("[validate] Testing CONSTRUCT query...");
  const constructResult = await store.query(
    sparql`CONSTRUCT { ?p schema:name ?n } WHERE { ?p a schema:Person ; schema:name ?n }`,
  );
  if (constructResult.type !== "construct") {
    throw new Error(`Expected construct result, got ${constructResult.type}`);
  }
  if (constructResult.triples.length !== 3) {
    throw new Error(
      `Expected 3 triples, got ${constructResult.triples.length}`,
    );
  }
  console.log(
    `[validate] CONSTRUCT returned ${constructResult.triples.length} triples`,
  );

  // --- 7. Cache round-trip ---
  console.log("[validate] Testing cache round-trip...");
  if (!existsSync(cachePath)) {
    throw new Error("Cache file was not written");
  }
  const cacheStart = performance.now();
  const cachedStore = await createStore({
    sources: [ttlPath],
    prefixes: {
      schema: "http://schema.org/",
      ex: "http://example.org/",
    },
    cache: cachePath,
  });
  const cacheTime = performance.now() - cacheStart;
  console.log(`[validate] Cached store loaded in ${cacheTime.toFixed(1)}ms`);

  const cachedResult = await cachedStore.query(
    sparql`SELECT ?name WHERE { ?p a schema:Person ; schema:name ?name . } ORDER BY ?name`,
  );
  if (cachedResult.type !== "select") {
    throw new Error(`Expected select result, got ${cachedResult.type}`);
  }
  if (cachedResult.bindings.length !== 3) {
    throw new Error(
      `Cached store: expected 3, got ${cachedResult.bindings.length}`,
    );
  }
  console.log(
    `[validate] Cache round-trip: ${cachedResult.bindings.length} bindings`,
  );

  // --- Cleanup ---
  store.dispose();
  cachedStore.dispose();
  rmSync(workDir, { recursive: true, force: true });

  const totalTime = performance.now() - start;
  console.log(`\n[validate] Total time: ${totalTime.toFixed(1)}ms`);
  console.log("[validate] ALL CHECKS PASSED");
}

run().catch((err) => {
  console.error("[validate] FAILED:", err);
  process.exit(1);
});
