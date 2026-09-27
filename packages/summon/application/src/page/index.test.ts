import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dryRun, type Effect, sequence_ } from "@canonical/task";
import { runTask, runUndo } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generator as domainGenerator } from "../domain/index.js";
import { generator } from "./index.js";
import { formatRoutingGuide, routingGuide } from "./routingGuide.js";

/**
 * The page generator adds to an existing domain. In a dry run the virtual
 * filesystem starts empty, so the domain generator runs first in the same
 * sequence to "create" src/domains/<domain>/routes.ts — mirroring real usage
 * (`summon domain` then `summon page`).
 */
function dryRunPage(pagePath: string) {
  const [domainName] = pagePath.split("/");
  return dryRun(
    sequence_([
      domainGenerator.generate({ domainName }),
      generator.generate({ pagePath }),
    ]),
  );
}

/** Effects the page generator itself emitted (after the domain's). */
function pageEffects(pagePath: string): Effect[] {
  const [domainName] = pagePath.split("/");
  const domainCount = dryRun(domainGenerator.generate({ domainName })).effects
    .length;
  return dryRunPage(pagePath).effects.slice(domainCount);
}

const writes = (effects: Effect[]) =>
  effects.filter((e) => e._tag === "WriteFile") as Array<
    Effect & { path: string; content: string }
  >;

describe("page generator", () => {
  it("writes exactly one file, named by the page, and edits nothing", () => {
    const effects = pageEffects("invoices/detail");

    expect(writes(effects).map((e) => e.path)).toEqual([
      "src/domains/invoices/DetailPage.tsx",
    ]);
    const touching = effects.filter(
      (e) => e._tag !== "WriteFile" && e._tag !== "Exists" && e._tag !== "Log",
    );
    expect(touching).toEqual([]);
  });

  it("scaffolds the thin page", () => {
    const [page] = writes(pageEffects("invoices/order-lines"));

    expect(page.content).toBe(`import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function OrderLinesPage(): ReactElement {
  return (
    <section aria-labelledby="orderLines-title">
      <Head title="Order Lines" />
      <h1 id="orderLines-title">Order Lines</h1>
    </section>
  );
}
`);
  });

  it("emits a page that Biome parses and leaves unchanged", () => {
    const [page] = writes(pageEffects("invoices/detail"));
    const require = createRequire(import.meta.url);
    const packageDir = fileURLToPath(new URL("../..", import.meta.url));
    const result = spawnSync(
      process.execPath,
      [
        require.resolve("@biomejs/biome/bin/biome"),
        "format",
        "--stdin-file-path=DetailPage.tsx",
      ],
      { cwd: packageDir, input: page.content, encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe(page.content);
  });

  it("prints the routing guide as one message after writing", () => {
    const effects = pageEffects("invoices/detail");
    const messages = effects
      .filter((e) => e._tag === "Log")
      .map((e) => (e as { message: string }).message);

    expect(messages).toEqual([
      formatRoutingGuide(routingGuide("invoices", "detail")).join("\n"),
    ]);
    expect(effects.at(-1)?._tag).toBe("Log");
  });

  it("rejects paths that are not exactly <domain>/<name>", () => {
    expect(() => dryRun(generator.generate({ pagePath: "detail" }))).toThrow(
      /at least 2 segments/,
    );
    expect(() =>
      dryRun(generator.generate({ pagePath: "invoices/detail/lines" })),
    ).toThrow(/at most 2 segments/);
  });

  it("fails when the domain does not exist", () => {
    expect(() =>
      dryRun(generator.generate({ pagePath: "missing/page" })),
    ).toThrow(/not found .*Create it first with: summon domain missing/);
  });
});

describe("page generator against the filesystem", () => {
  let cwd: string;
  const routes = "export default {};\n";
  const pageFile = () => path.join(cwd, "src/domains/catalog/DetailPage.tsx");
  const routesFile = () => path.join(cwd, "src/domains/catalog/routes.ts");

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "summon-page-"));
    mkdirSync(path.join(cwd, "src/domains/catalog"), { recursive: true });
    writeFileSync(routesFile(), routes);
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("--undo deletes the page it wrote and nothing else", async () => {
    const task = () => generator.generate({ pagePath: "catalog/detail" });

    await runTask(task(), { cwd });
    expect(existsSync(pageFile())).toBe(true);

    const result = await runUndo(task(), { cwd });
    expect(result.undoCount).toBe(1);
    expect(existsSync(pageFile())).toBe(false);
    expect(readFileSync(routesFile(), "utf8")).toBe(routes);
  });

  it("refuses to overwrite an existing page", async () => {
    writeFileSync(pageFile(), "hand-written\n");

    await expect(
      runTask(generator.generate({ pagePath: "catalog/detail" }), { cwd }),
    ).rejects.toThrow(/already exists/);
    expect(readFileSync(pageFile(), "utf8")).toBe("hand-written\n");
  });
});
