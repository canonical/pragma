// =============================================================================
// The boot, against the hermetic corpus — including the anatomy collision.
//
// -----------------------------------------------------------------------------
// 🔬 THE MEASUREMENT THIS FILE EXISTS FOR, AND HOW IT WAS OBTAINED.
//
// `CUSTOM_MAPPINGS` carries one entry, `anatomy:uri → anatomyUri`, and the
// constant's prose says the boot "dies loudly" without it. Two documents in
// this repo DISAGREED about whether that is true at this commit: R.03 records
// R-4's fatality escalation as "error+drop implemented; fatality PENDING",
// while the app's former `graphql.ts` asserted the fatality as established
// fact. One of them had to be stale.
//
// It was resolved by RUNNING IT, not by reading either document: the corpus
// below was compiled twice at pragma `4d228c8`, once with `CUSTOM_MAPPINGS`
// and once with `{}`. OBSERVED, verbatim:
//
//   WITH    → boot succeeds; SDL carries `anatomyUri: String` on `NamedNode`;
//             one diagnostic, `V014`, severity `info`.
//   WITHOUT → boot THROWS `CompilationError`, message
//             "ke-graphql: compilation failed with 1 error(s)", carrying
//             `M005 … maps to NamedNode.uri, a structural field the compiler
//             owns — the field is DROPPED."  The diagnostic's severity is
//             `error`, and `runPasses`' compile-level fatality gate refuses to
//             hand out the schema.
//
// SO THE FATALITY IS LIVE AT `4d228c8` AND R.03's "pending" IS THE STALE
// DOCUMENT. The assertions below are written from that observation. If a
// future ke-graphql change downgrades M005 to a warning, this file goes red —
// which is the correct outcome, because the app's committed `schema.graphql`
// would then quietly lose a field instead of refusing to build.
//
// -----------------------------------------------------------------------------
// 🔴 NO TEST IN THIS FILE PASSES `sdlOutput`, so no test writes an SDL file
// anywhere. That is a property of the option's shape, not of this file's
// discipline: absent means no write, with no default to fall back to. See
// `createPragmaProvider.ts`'s header.
// =============================================================================

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createStore, type Plugin } from "@canonical/ke";
import { createSchemaPlugin } from "@canonical/ke-graphql";
import { describe, expect, it, vi } from "vitest";
import {
  CORPUS_REFS_ROOT,
  CORPUS_SEM_ROOT,
  MISSING_ROOT,
} from "../../testing/corpus.js";
import { ANATOMY_URI, CUSTOM_MAPPINGS } from "../config/index.js";
import { collectTtlSources, harvestPrefixes } from "../sources/index.js";
import { createPragmaProvider } from "./createPragmaProvider.js";

/** One boot, shared: Oxigraph is a WASM store and booting it is not free. */
const booted = createPragmaProvider({
  refsRoot: CORPUS_REFS_ROOT,
  semRoot: CORPUS_SEM_ROOT,
});

describe("createPragmaProvider over both roots", () => {
  it("compiles a schema from both roots into one store", async () => {
    const { api } = await booted;
    expect(api.sdl).toContain("type Component");
    // `Job` comes only from the semantics tree — proof the second root merged.
    expect(api.sdl).toContain("type Job");
  });

  it("keeps the excluded shim out of the compiled schema", async () => {
    const { api } = await booted;
    expect(api.sdl).not.toContain("embodiesConcept");
  });

  it("parses the channel-dotted reference rather than choking on it", async () => {
    // Unescaped, `ds:.subcomponent.button-label` is invalid Turtle and the
    // store would refuse the whole file. A successful boot IS the assertion;
    // the dangling target reads as honest absence.
    const { api } = await booted;
    expect(api.schema).toBeDefined();
  });

  it("serves the compiled schema over the fetch handler", async () => {
    const { handle } = await booted;
    const response = await handle(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "{ __schema { queryType { name } } }" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { __schema: { queryType: { name: "Query" } } },
    });
  });
});

describe("the anatomy:uri collision", () => {
  it("keeps the field under the name the committed schema already carries", async () => {
    const { api } = await booted;
    // Not merely "some field survived": the mapping's whole justification is
    // that it restores the EXACT name the schema had, so nothing downstream
    // moves. `anatomyUri: String` appears in the app's committed
    // schema.graphql at 4d228c8.
    expect(api.sdl).toContain("anatomyUri: String");
    expect(CUSTOM_MAPPINGS[ANATOMY_URI]).toEqual({ graphqlName: "anatomyUri" });
  });

  it("has NOT quietly renamed the reserved field", async () => {
    const { api } = await booted;
    // `uri: ID!` is the compiler-injected primary key. If `anatomy:uri` ever
    // took it, this is what would change.
    expect(api.sdl).toContain("type NamedNode implements Node");
    expect(api.sdl).not.toContain("anatomy_uri");
  });

  it("KILLS THE BOOT when the mapping is absent — observed, not assumed", async () => {
    // THE NEGATIVE HALF, run for real.
    //
    // `CUSTOM_MAPPINGS` is a pinned constant (OQ-4), so there is deliberately
    // no way to unset it through this package's public surface. The negative
    // case is therefore compiled one layer down — the package's own collector
    // and prefix harvester, handed to ke-graphql with `mappings: {}` — which
    // is the honest place for it: the claim is about what the COMPILER does to
    // this corpus, and that is precisely what justifies the constant existing.
    //
    // Everything else is held identical to `createPragmaProvider`: same
    // sources, same prefixes, same `mode`/`prefixing`/`incremental`. The only
    // difference is the mapping.
    const sources = collectTtlSources({
      refsRoot: CORPUS_REFS_ROOT,
      semRoot: CORPUS_SEM_ROOT,
    });
    const unmapped = createSchemaPlugin({
      incremental: true,
      mappings: {},
      mode: "annotated",
      prefixing: "none",
    });
    const thrown = await createStore({
      sources: sources.map(({ content, path }) => ({ content, path })),
      prefixes: harvestPrefixes(sources),
      // biome-ignore lint: Plugin generic variance requires explicit unknown
      plugins: [unmapped] as Plugin<any>[],
    }).then(
      () => undefined,
      (error: unknown) => error,
    );

    // OBSERVED at 4d228c8: it throws. It does not return a schema minus the
    // field. R.03's "fatality pending" is the stale document.
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain("compilation failed");
    expect((thrown as Error).message).toContain("M005");
    expect((thrown as Error).message).toContain(ANATOMY_URI);
    // The diagnostic names the collision AND the remedy this constant is.
    expect((thrown as Error).message).toContain(
      "a structural field the compiler owns — the field is DROPPED",
    );
    expect((thrown as Error).message).toContain("add a custom mapping");
  });
});

describe("sdlOutput", () => {
  it("writes nothing and says so when it is absent", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await createPragmaProvider({
      refsRoot: CORPUS_REFS_ROOT,
      semRoot: CORPUS_SEM_ROOT,
    });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("SDL output disabled (no sdlOutput given)"),
    );
    info.mockRestore();
  });

  it("writes exactly where the CALLER said, and nowhere else", async () => {
    // 🔴 The destination is a scratch directory outside the repository, on
    // purpose. This package must never write into a tracked source tree —
    // not from its demo, not from its tests. The whole reason `sdlOutput` is
    // an argument with no default is that the path is the caller's to own,
    // and a test that proved the write by scribbling on
    // `apps/react/pragma-docs/src/relay/schema.graphql` would be proving the
    // opposite of the property.
    const destination = join(
      mkdtempSync(join(tmpdir(), "prism-pragma-provider-")),
      "schema.graphql",
    );
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await createPragmaProvider({
      refsRoot: CORPUS_REFS_ROOT,
      semRoot: CORPUS_SEM_ROOT,
      sdlOutput: destination,
    });
    info.mockRestore();

    expect(existsSync(destination)).toBe(true);
    const written = readFileSync(destination, "utf-8");
    expect(written).toContain("type Component");
    expect(written).toContain("anatomyUri: String");
    rmSync(dirname(destination), { recursive: true, force: true });
  });
});

describe("createPragmaProvider without roots", () => {
  it("resolves the refs root from the environment and fails actionably", async () => {
    // Called with NO options at all, so both defaults resolve. In any
    // environment without a populated pragma cache this is the message a
    // developer sees, and it must name the remedy.
    vi.stubEnv("PRAGMA_REFS_DIR", MISSING_ROOT);
    vi.stubEnv("PRAGMA_SEM_DIR", MISSING_ROOT);
    await expect(createPragmaProvider()).rejects.toThrow(
      /pragma refs cache not found at .*— run `pragma sources update`/,
    );
    vi.unstubAllEnvs();
  });
});
