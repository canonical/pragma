// Cloudflare Worker serving the compiled graph (~25-60 ms cold isolate):
// - the extraction artifact rebuilds the schema in ~5-15 ms (no Pass 1)
// - TTL ships as inline sources (no filesystem on Workers)
// - Oxigraph WASM is precompiled at deploy -> instantiation ~1 ms
// - the store boots lazily: TBox queries answer before it resolves
//
// wrangler.toml needs: compatibility_flags = ["nodejs_compat"]
// Generate the two imported artifacts with `pragma graphql build`.

import { createStore } from "@canonical/ke";
import { compileFromExtraction } from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";
import artifact from "./extraction.json";
// Bundle the TTL as text (wrangler rule: type = "Text" for **/*.ttl)
import ontologyTtl from "./graph.ttl";

const result = compileFromExtraction(artifact, { loaderCache: "process" });

// Lazy store: kicked off at isolate start, awaited only by ABox resolvers.
const storeReady = createStore({
  sources: [{ content: ontologyTtl, path: "bundle:graph.ttl" }],
  prefixes: { ds: "https://ds.canonical.com/" },
});

const handler = createGraphQLHandler(result.schema, {
  context: () => result.createContext(storeReady),
  graphiql: false,
  introspection: false,
});

export default {
  fetch: (request) => handler(request),
};
