/**
 * `config show` payload projection — declared story BODIES never ship.
 *
 * MCP returns the JSON formatter's output verbatim, so anything in this payload
 * is tokens in every `config_show` tool call. The distribution declares five
 * read stories on its packs, whose bodies are SPARQL; carried through, they take
 * the payload from ~1.3 KB to ~11 KB — larger than `capabilities`, the discovery
 * tool, for the least useful content in the surface.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import { collectConfigShow } from "./collectConfigShow.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};

describe("config show payload", () => {
  it("names the declared packs but carries no story bodies", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-config-show-"));
    const data = await collectConfigShow(bootRuntime(FLAGS, cwd));

    // The pack declarations themselves are still fully reported…
    expect(
      data.config.packs?.map((pack) =>
        typeof pack === "string" ? pack : pack.name,
      ),
    ).toEqual([
      "@canonical/design-system",
      "@canonical/anatomy-dsl",
      "@canonical/code-standards",
    ]);
    for (const pack of data.config.packs ?? []) {
      expect(
        typeof pack === "string" ? undefined : pack.stories,
      ).toBeUndefined();
    }
    expect(data.config.stories).toBeUndefined();

    // …and provenance stays honest: the payload still says where they came from.
    expect(data.origins.packs).toBe("default");
    expect(data.origins.stories).toBe("default");

    // The sharp end: no query text reaches the agent surface.
    const payload = JSON.stringify(data);
    expect(payload).not.toContain("SELECT ?");
    expect(payload.length).toBeLessThan(3000);
  });
});
