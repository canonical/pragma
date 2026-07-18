import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitSurface } from "../kernel/spec/emitSurface.js";
import {
  assertConforms,
  type Covenant,
} from "../kernel/spec/surfaceConformance.js";
import { capabilities } from "./index.js";

/** The committed covenant, read from disk exactly as a consumer would. */
const golden = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../surface/surface.v2.json", import.meta.url)),
    "utf-8",
  ),
) as Covenant;

describe("surface conformance — capabilities ⊆ covenant (PROTECTED)", () => {
  const emitted = emitSurface(capabilities);

  it("the live capabilities conform to the frozen covenant", () => {
    expect(() => assertConforms(emitted, golden)).not.toThrow();
  });

  it("emits info + config show + the storeless sources noun", () => {
    expect(emitted.nouns.info?.verbs).toEqual([{ v: "info", mcp: "info" }]);
    expect(emitted.nouns.config?.verbs).toEqual([
      { v: "show", mcp: "config_show" },
    ]);
    // The sources noun is storeless BY DESIGN — no `needsStore` on either verb
    // (status must report a cold store; update is what builds it). The covenant
    // was reconciled to match in this PR.
    expect(emitted.nouns.sources?.verbs).toEqual([
      { v: "status", mcp: "sources_status" },
      {
        v: "update",
        flags: ["--frozen"],
        mutates: true,
        mcp: "sources_update",
      },
    ]);
    // Hidden meta verbs (__complete, mcp) are excluded from the surface.
    expect(emitted.nouns.mcp).toBeUndefined();
    expect(emitted.nouns.__complete).toBeUndefined();
  });

  it("emits the info, config_show, and sources tools, all blessed by the covenant", () => {
    expect(emitted.mcpSurface.tools).toEqual([
      "config_show",
      "info",
      "sources_status",
      "sources_update",
    ]);
    for (const tool of emitted.mcpSurface.tools) {
      expect(golden.mcpSurface.tools).toContain(tool);
    }
  });
});
