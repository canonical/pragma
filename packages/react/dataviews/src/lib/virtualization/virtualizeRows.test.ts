import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as root from "../../index.js";
import { WINDOWED } from "../windowing/index.js";
import { VirtualBody } from "./common/index.js";
import * as entry from "./index.js";
import virtualizeRows from "./virtualizeRows.js";

describe("virtualizeRows", () => {
  it("describes the windowing, carrying the body it renders", () => {
    const windowing = virtualizeRows({ estimatedRowHeight: 40 });
    expect(windowing[WINDOWED]).toEqual({
      body: VirtualBody,
      estimatedRowHeight: 40,
    });
    expect(Object.isFrozen(windowing)).toBe(true);
    expect(Object.isFrozen(windowing[WINDOWED])).toBe(true);
    // Nothing but the private key: the descriptor has no field to read.
    expect(Object.keys(windowing)).toEqual([]);
  });

  it("refuses an estimate that is not a positive number of pixels", () => {
    for (const estimatedRowHeight of [0, -1, Number.NaN, Infinity]) {
      expect(() => virtualizeRows({ estimatedRowHeight })).toThrow(
        "virtualizeRows requires a positive estimatedRowHeight, in pixels",
      );
    }
  });

  it("is reached only through its own entry point", () => {
    expect(Object.keys(entry)).toEqual(["virtualizeRows"]);
    expect(root).not.toHaveProperty("virtualizeRows");
    const manifest = JSON.parse(
      readFileSync(
        path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "../../../package.json",
        ),
        "utf8",
      ),
    );
    expect(manifest.exports["./virtualization"]).toEqual({
      types: "./dist/types/lib/virtualization/index.d.ts",
      import: "./dist/esm/lib/virtualization/index.js",
    });
  });
});
