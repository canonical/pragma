/**
 * `runSelect` — the single choke point for every TRUSTED, generated SPARQL read.
 *
 * Pins the remap: a generated query is composed from declared and pack-authored
 * terms, never from user input, so a "Prefix not found" from the facade means
 * the store cannot answer this read — an actionable error, NOT a raw one
 * collapsing to INTERNAL_ERROR ("please report this issue").
 *
 * WHICH actionable error is the story's provenance to decide, which is the
 * second thing pinned here. A DISTRIBUTION story keeps STORE_UNAVAILABLE and its
 * recovery, carrying BOTH the CLI command (`pragma sources update`) and the MCP
 * tool an agent calls (`sources_update`), so either surface can recover. A
 * CONFIG or PACKAGE story gets CONFIG_ERROR naming the story instead: its author
 * named a prefix nothing binds, and `sources update` cannot conjure a term.
 */

import { describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../../runtime/types.js";
import { distributionSource, type StorySource } from "../types.js";
import { runSelect } from "./runSelect.js";

/** A story declared by a package (a third party's own file). */
const PACKAGE: StorySource = {
  label: "@acme/recipes/stories/recipe.json",
  origin: "package",
};
/** A story declared in the user's config. */
const CONFIG: StorySource = { label: "config", origin: "config" };

/** A runtime whose query facade throws the given error for every SPARQL call. */
function throwingRuntime(error: unknown): Pick<PragmaRuntime, "query"> {
  return {
    query: {
      sparql: async () => {
        throw error;
      },
    } as unknown as PragmaRuntime["query"],
  };
}

/** A runtime whose facade resolves a fixed SELECT result. */
function selectRuntime(
  bindings: Record<string, string>[],
): Pick<PragmaRuntime, "query"> {
  return {
    query: {
      sparql: async () => ({ type: "select", bindings }),
    } as unknown as PragmaRuntime["query"],
  };
}

describe("runSelect — unanswerable-store remap (ROOT A)", () => {
  it("remaps a 'Prefix not found' to STORE_UNAVAILABLE with CLI + MCP recovery", async () => {
    let caught: unknown;
    try {
      await runSelect(
        throwingRuntime(new Error("Prefix not found: ds")),
        "SELECT ?x WHERE { ?x a ds:Thing }",
        distributionSource("block"),
      );
    } catch (error) {
      caught = error;
    }

    // The whole point: it is NOT an unclassified INTERNAL_ERROR.
    expect(caught).toMatchObject({ code: "STORE_UNAVAILABLE" });
    // …and it claims only what it knows. The same failure reaches a store that
    // IS built, from a pack whose vocabulary is simply different, so the
    // message must not tell that user their store is unbuilt.
    expect((caught as { message: string }).message).toContain(
      "not built from a pack that defines every term",
    );
    const recovery = (caught as { recovery?: Record<string, unknown> })
      .recovery;
    expect(recovery?.cli).toBe("pragma sources update");
    // An agent cannot run a shell command — it recovers via the tool.
    expect(recovery?.mcp).toMatchObject({ tool: "sources_update" });
  });

  it("passes a non-prefix facade error through unchanged (not remapped)", async () => {
    const boom = new Error("some other engine failure");
    let caught: unknown;
    try {
      await runSelect(
        throwingRuntime(boom),
        "SELECT ?x WHERE {}",
        distributionSource("block"),
      );
    } catch (error) {
      caught = error;
    }
    // A generic failure is NOT masquerading as a cold store.
    expect(caught).toBe(boom);
  });

  it("returns the bindings on a well-formed SELECT", async () => {
    const rows = await runSelect(
      selectRuntime([{ name: "Button" }, { name: "Card" }]),
      "SELECT ?name WHERE { ?x ds:name ?name }",
      distributionSource("block"),
    );
    expect(rows).toEqual([{ name: "Button" }, { name: "Card" }]);
  });
});

describe("runSelect — an unbound prefix is diagnosed by PROVENANCE", () => {
  const unbound = (): Error => new Error("Prefix not found: acme");

  for (const source of [PACKAGE, CONFIG]) {
    it(`a ${source.origin} story gets CONFIG_ERROR naming the story`, async () => {
      // `sources update` cannot help an author who named a prefix nothing
      // binds — no amount of building conjures a term. Telling them to run it
      // (as this path used to) sends them round a loop that cannot terminate.
      // `buildIndex` already treats the same condition as the ordinary
      // third-party case; the query path used to escalate it.
      let caught: unknown;
      try {
        await runSelect(
          throwingRuntime(unbound()),
          "SELECT ?x WHERE { ?x a acme:Thing }",
          source,
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
      const { message } = caught as { message: string };
      // It names the story, so the author knows which file to fix.
      expect(message).toContain(source.label);
      expect(message).toContain("does not bind");
      // And it does NOT send them to the lever that cannot help.
      expect(message).not.toContain("sources update");
      expect(
        (caught as { recovery?: { cli?: string } }).recovery?.cli,
      ).toBeUndefined();
    });
  }

  it("the distribution's own story keeps STORE_UNAVAILABLE", async () => {
    // Unchanged, and the reason is real: the distribution's stories ship with
    // the packs that bind their terms, so an unbound prefix there means nothing
    // is built yet — which `sources update` does fix.
    let caught: unknown;
    try {
      await runSelect(
        throwingRuntime(unbound()),
        "SELECT ?x WHERE { ?x a ds:Thing }",
        distributionSource("pragma.conf.ts"),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "STORE_UNAVAILABLE" });
    expect((caught as { recovery?: { cli?: string } }).recovery?.cli).toBe(
      "pragma sources update",
    );
  });

  it("a non-SELECT still names the story on every origin", async () => {
    const askRuntime = {
      query: {
        sparql: async () => ({ type: "ask", boolean: true }),
      } as unknown as PragmaRuntime["query"],
    };
    for (const source of [PACKAGE, CONFIG, distributionSource("block")]) {
      await expect(
        runSelect(askRuntime, "ASK { ?x ?y ?z }", source),
      ).rejects.toMatchObject({
        code: "CONFIG_ERROR",
        message: expect.stringContaining(source.label),
      });
    }
  });
});
