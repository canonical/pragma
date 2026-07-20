import { describe, expect, it } from "vitest";
import { runStoreProbe } from "./probe.js";

describe("store probe (in-process)", () => {
  it("boots the embedded pack and reports entity + triple counts", async () => {
    const out = JSON.parse(await runStoreProbe()) as {
      ok: boolean;
      entities: number;
      triples: string;
    };
    expect(out.ok).toBe(true);
    // The embedded sample pack ships six indexed entities (3 abox + 3 tbox).
    expect(out.entities).toBe(6);
    expect(Number(out.triples)).toBeGreaterThan(0);
  });
});
