import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GENERATOR_INVALID_ANSWER } from "@canonical/summon-core";
import { dryRun, type Effect, sequence_ } from "@canonical/task";
import { runTask, runUndo } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generator as domainGenerator } from "../domain/index.js";
import { formatWithBiome } from "../testing/formatWithBiome.js";
import { generator } from "./index.js";

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
    <section aria-labelledby="order-lines-title">
      <Head title="Order Lines" />
      <h1 id="order-lines-title">Order Lines</h1>
    </section>
  );
}
`);
  });

  it("emits a page that Biome parses and leaves unchanged", () => {
    const [page] = writes(pageEffects("invoices/detail"));
    const { failures, formatted } = formatWithBiome({
      "DetailPage.tsx": page.content,
    });

    expect(failures).toBeNull();
    expect(formatted["DetailPage.tsx"]).toBe(page.content);
  });

  it("prints the routing guide as one message after writing", () => {
    const effects = pageEffects("invoices/detail");
    const messages = effects
      .filter((e) => e._tag === "Log")
      .map((e) => (e as { message: string }).message);

    // The guide's text is pinned in guide.test.ts.
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(
      /^Created src\/domains\/invoices\/DetailPage\.tsx\./,
    );
    expect(effects.at(-1)?._tag).toBe("Log");
  });

  it("rejects paths that are not exactly <domain>/<name>", () => {
    expect(() => dryRun(generator.generate({ pagePath: "detail" }))).toThrow(
      /at least 2 segments/,
    );
    expect(() =>
      dryRun(generator.generate({ pagePath: "invoices/detail/lines" })),
    ).toThrow(/at most 2 segments/);
    expect(() =>
      dryRun(generator.generate({ pagePath: "/invoices/detail" })),
    ).toThrow(/not an absolute path/);
    expect(() =>
      dryRun(generator.generate({ pagePath: "../invoices" })),
    ).toThrow(/"\.\."/);
  });

  it("refuses a page name that is not kebab-case, as an invalid answer", () => {
    for (const pagePath of [
      "invoices/DETAIL",
      "invoices/Detail",
      "invoices/order--lines",
    ]) {
      expect(() => dryRun(generator.generate({ pagePath }))).toThrow(
        expect.objectContaining({
          code: GENERATOR_INVALID_ANSWER,
          message: expect.stringContaining("must be kebab-case"),
        }),
      );
    }
  });

  it("refuses a page name whose route key JavaScript reserves, as an invalid answer", () => {
    for (const name of ["new", "delete", "default"]) {
      expect(() =>
        dryRun(generator.generate({ pagePath: `invoices/${name}` })),
      ).toThrow(
        expect.objectContaining({
          code: GENERATOR_INVALID_ANSWER,
          message: expect.stringContaining(`route key "${name}"`),
        }),
      );
    }
    // A name whose key is not itself reserved is fine.
    expect(() => pageEffects("invoices/new-invoice")).not.toThrow();
  });

  it("fails when the domain does not exist, as an invalid answer", () => {
    expect(() =>
      dryRun(generator.generate({ pagePath: "missing/page" })),
    ).toThrow(
      expect.objectContaining({
        code: GENERATOR_INVALID_ANSWER,
        message:
          'Domain "missing" not found: src/domains/missing/routes.ts is missing. Create the domain first.',
      }),
    );
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
    ).rejects.toMatchObject({
      code: GENERATOR_INVALID_ANSWER,
      message: expect.stringContaining("already exists"),
    });
    expect(readFileSync(pageFile(), "utf8")).toBe("hand-written\n");
  });
});
