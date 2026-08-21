import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import emitParityContract from "./emitParityContract.js";

describe("parity contract drift-guard — emitted == committed", () => {
  it("docs/parity-contract.md is byte-identical to the emitter's output", () => {
    const committed = readFileSync(
      fileURLToPath(new URL("../../docs/parity-contract.md", import.meta.url)),
      "utf-8",
    );
    // Change the projection's behavior without the doc, or the doc without
    // the behavior, and this fails; `bun run gen:parity` is the fix.
    expect(committed).toBe(emitParityContract());
  });

  it("the emitted contract carries every generated section", () => {
    const contract = emitParityContract();
    expect(contract).toContain("## 1. The invariant");
    expect(contract).toContain("## 2. Grammar derivation");
    expect(contract).toContain("## 3. The interaction decision");
    expect(contract).toContain("## 4. The template-seam guarantee");
    expect(contract).toContain("## 5. The MCP mapping rule");
    // The generated flag table carries the polarity rule…
    expect(contract).toContain("`--no-with-styles`");
    expect(contract).toContain("`--with-relay`");
    // …the interaction table is complete (32 enumerated rows)…
    expect(
      contract.split("\n").filter((line) => /^\| (yes|—) \|/.test(line)).length,
    ).toBe(32);
    // …and the refusal template is the shared one, verbatim.
    expect(contract).toContain(
      "Refusing to scaffold in a non-interactive run without complete input.",
    );
    expect(contract).toContain("Missing: --component-path, --with-styles.");
  });
});
