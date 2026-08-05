/**
 * The binding table's three invariants — each one a bug the module header
 * names, pinned here so a fork that edits the table gets told rather than
 * finding out at runtime with an empty page.
 *
 * There is deliberately NO assertion on the literal strings beyond their
 * shape. The values are the deployment's to choose; pinning
 * `"cs:CodeStandard"` would make a fork's first edit red for no reason and
 * would test nothing about the app.
 */

import { describe, expect, it } from "vitest";
import {
  LOBBY_COMPONENT_CLASS,
  LOBBY_PATTERN_CLASS,
  LOBBY_STANDARD_CLASS,
} from "#domains/marketing/lobbyQuery.js";
import { GRAPH_BINDINGS } from "./index.js";

/** `prefix:local` — a declared prefix and a local name, never a scheme. */
const PREFIXED_FORM = /^[A-Za-z][\w.-]*:[^/][^\s]*$/;

describe("GRAPH_BINDINGS", () => {
  it("states every binding in the PREFIXED form, never an absolute IRI", () => {
    // `ontologyClass(uri:)` accepts both forms, so an absolute IRI here
    // would WORK — and then silently defeat every `toPrefixedUri`
    // comparison written against these values, because the graph echoes
    // the absolute IRI back either way.
    expect(
      Object.entries(GRAPH_BINDINGS)
        .filter(([, binding]) => !PREFIXED_FORM.test(binding.classUri))
        .map(([lens]) => lens),
    ).toEqual([]);
  });

  it("binds each lens to a DISTINCT class", () => {
    const classUris = Object.values(GRAPH_BINDINGS).map(
      (binding) => binding.classUri,
    );
    expect(new Set(classUris).size).toBe(classUris.length);
  });

  it("is the single source the lobby's three doors read", () => {
    // The lobby kept its three exported names (nothing in
    // `domains/marketing` had to move), but they are no longer a second
    // place the same three strings are spelled.
    expect(LOBBY_COMPONENT_CLASS).toBe(GRAPH_BINDINGS.components.classUri);
    expect(LOBBY_PATTERN_CLASS).toBe(GRAPH_BINDINGS.patterns.classUri);
    expect(LOBBY_STANDARD_CLASS).toBe(GRAPH_BINDINGS.standards.classUri);
  });
});
