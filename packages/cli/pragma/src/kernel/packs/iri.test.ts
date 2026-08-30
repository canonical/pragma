/**
 * URI resolution — what it accepts, and what it says when it refuses.
 *
 * Both halves matter and only one was covered. `resolveUri` is reached by every
 * read (`graph inspect`, every pack lookup, the `pragma:{+uri}` resource), so
 * its diagnostic is the sentence a user or an agent actually has to act on.
 * Nothing asserted that sentence, which is how it came to quote a string the
 * caller never typed.
 */

import { describe, expect, it } from "vitest";
import { resolveUri } from "./iri.js";

const DS = "https://ds.canonical.com/";
const PREFIXES: Readonly<Record<string, string>> = { ds: DS };

/** Run `resolveUri` and hand back whatever it threw, for assertion. */
function refusal(uri: string): { code?: string; message?: string } {
  try {
    resolveUri(uri, PREFIXES);
    throw new Error(`expected "${uri}" to be refused`);
  } catch (error) {
    return error as { code?: string; message?: string };
  }
}

describe("resolveUri", () => {
  it("resolves the plain forms", () => {
    expect(resolveUri("ds:Component", PREFIXES)).toBe(`${DS}Component`);
    expect(resolveUri(`${DS}Component`, PREFIXES)).toBe(`${DS}Component`);
  });

  it("accepts a percent-encoded prefixed name", () => {
    // A client that encodes the URI it puts in a `pragma:{+uri}` read is not
    // doing anything wrong; refusing it made the resource surface reject its
    // own advertised identifiers.
    expect(resolveUri("ds%3AComponent", PREFIXES)).toBe(`${DS}Component`);
  });

  it("names the URI the CALLER typed, not the expansion", () => {
    // The safety check runs on the expanded IRI — it has to — but the message
    // is for whoever typed the input, and they never typed the expansion.
    const error = refusal("ds:my component");
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toContain("ds:my component");
    expect(error.message).not.toContain(DS);
  });

  it("refuses malformed percent input as INVALID_INPUT, not a URIError", () => {
    // `decodeURIComponent` throws `URIError` on a truncated escape. Escaping as
    // a raw TypeError would surface as an internal fault rather than the
    // caller's bad input.
    const error = refusal("%E0%A4%A");
    expect(error.code).toBe("INVALID_INPUT");
    expect(error).not.toBeInstanceOf(URIError);
    expect(error.message).toContain("%E0%A4%A");
  });

  it("refuses an unknown prefix and offers the ones it knows", () => {
    const error = refusal("nope:Thing") as {
      code?: string;
      validOptions?: string[];
    };
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.validOptions).toContain("ds");
  });

  it("refuses a payload that would break out of the <iri> token", () => {
    // The injection guard, asserted here rather than only through a verb.
    const error = refusal('ds:x> } INSERT { ?s ?p "y" } #');
    expect(error.code).toBe("INVALID_INPUT");
  });
});
