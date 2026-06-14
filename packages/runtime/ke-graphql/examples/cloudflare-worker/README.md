# ke-graphql on Cloudflare Workers

Cold isolate ≈ 25–60 ms: Workers precompile the Oxigraph WASM at deploy
(instantiation ~1 ms), the extraction artifact skips Pass 1 entirely
(schema in ~5–15 ms), and the store boots lazily — TBox/ontology queries
answer before the TTL even finishes parsing.

```sh
pragma graphql build --sdl schema.graphql --extraction extraction.json <ttl sources>
cp <your graph>.ttl graph.ttl
wrangler deploy
```

Constraints: paid plan recommended (the wasm is a few MB; free tier's
compressed size limit is tight), 128 MB isolate memory (fine ≤ ~100k
triples), `nodejs_compat` flag required.

For 0 ms: put the Cache API in front of persisted queries
(`createPersistedManifest` + `allowArbitraryQueries: false`) — responses
are pure functions of (hash, variables) until the next deploy.
