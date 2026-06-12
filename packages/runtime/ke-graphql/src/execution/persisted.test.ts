import { describe, expect, it } from "vitest";
import { createPersistedManifest, sha256Hex } from "./persisted.js";

describe("persisted-query manifest (KG.19)", () => {
  it("hashes with SHA-256 (Relay/Apollo convention)", async () => {
    // echo -n "{ __typename }" | sha256sum
    expect(await sha256Hex("{ __typename }")).toBe(
      "7f56e67dd21ab3f30d1ff8b7bed08893f0a0db86449836189b361dd1e56ddb4b",
    );
  });

  it("builds a manifest keyed by hash", async () => {
    const a = "{ components(first: 1) { edges { cursor } } }";
    const b = "{ ontologies { prefix } }";
    const manifest = await createPersistedManifest([a, b]);
    expect(Object.keys(manifest)).toHaveLength(2);
    expect(manifest[await sha256Hex(a)]).toBe(a);
    expect(manifest[await sha256Hex(b)]).toBe(b);
  });
});
