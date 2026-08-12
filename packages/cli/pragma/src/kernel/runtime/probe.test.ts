import { describe, expect, it } from "vitest";
import { embeddedManifest } from "./graphpack/embedded.js";
import { runStoreProbe } from "./probe.js";

describe("store probe (in-process)", () => {
  it("boots the embedded pack and finds the triples its manifest claims", async () => {
    const out = JSON.parse(await runStoreProbe()) as {
      ok: boolean;
      entities: number;
      triples: string;
    };
    expect(out.ok).toBe(true);
    // Against the COMMITTED manifest, not a recomputation: a store booted from
    // `data.nq` must really hold what `manifest.json` says was built into it.
    // That catches a regenerated dump that disagrees with its own provenance,
    // and needs no literal that churns whenever upstream moves.
    expect(Number(out.triples)).toBe(embeddedManifest().tripleCount);
    expect(out.entities).toBeGreaterThan(0);
  });
});
