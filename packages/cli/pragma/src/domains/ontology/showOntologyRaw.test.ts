import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import { PragmaError } from "../../error/index.js";
import showOntologyRaw from "./showOntologyRaw.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("showOntologyRaw", () => {
  it("returns triples for a known namespace", async () => {
    const triples = await showOntologyRaw(store, "ds");
    expect(triples.length).toBeGreaterThan(0);

    const hasDs = triples.some((t) =>
      t.subject.startsWith("https://ds.canonical.com/"),
    );
    expect(hasDs).toBe(true);
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(showOntologyRaw(store, "unknown")).rejects.toThrow(
      PragmaError,
    );

    try {
      await showOntologyRaw(store, "unknown");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });
});
