/**
 * `runSelect` — the single choke point for every TRUSTED, generated SPARQL read.
 *
 * Pins the remap: a generated query is composed from declared and pack-authored
 * terms, never from user input, so a "Prefix not found" from the facade means
 * the store cannot answer this read — an actionable STORE_UNAVAILABLE, NOT a raw
 * error collapsing to INTERNAL_ERROR ("please report this issue"). The recovery
 * carries BOTH the CLI command (`pragma sources update`) and the MCP tool an
 * agent calls (`sources_update`), so either surface can recover.
 */

import { describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../../runtime/types.js";
import { runSelect } from "./runSelect.js";

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
        "block",
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
      await runSelect(throwingRuntime(boom), "SELECT ?x WHERE {}", "block");
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
      "block",
    );
    expect(rows).toEqual([{ name: "Button" }, { name: "Card" }]);
  });
});
