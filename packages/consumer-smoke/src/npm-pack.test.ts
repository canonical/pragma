/**
 * Regression tests for npm-pack.ts: `npm pack --json` parsing must read
 * stdout only and survive noise on either stream. Run with:
 *
 *   bun run test   (vitest, from packages/consumer-smoke)
 */

import { describe, expect, test } from "vitest";
import { packFilename, parsePackJson } from "./npm-pack.js";

const PACK_JSON = JSON.stringify([
  {
    id: "@canonical/react-ds-global@0.29.0",
    name: "@canonical/react-ds-global",
    filename: "canonical-react-ds-global-0.29.0.tgz",
    files: [{ path: "dist/esm/index.js", size: 1234 }],
    entryCount: 42,
  },
]);

describe("packFilename", () => {
  test("parses when stderr is non-empty (npm warn / notices)", () => {
    // Regression: the old parser merged stdout+stderr and sliced from the
    // first `[` to end-of-string, so ANY stderr after the JSON broke it.
    const result = packFilename({
      stdout: PACK_JSON,
      stderr:
        "npm warn deprecated something@1.0.0: use other@2\nnpm notice New minor version of npm available!",
    });
    expect(result).toBe("canonical-react-ds-global-0.29.0.tgz");
  });

  test("never reads JSON from stderr", () => {
    expect(
      packFilename({
        stdout: PACK_JSON,
        stderr: '[{"filename":"wrong-package-from-stderr.tgz"}]',
      }),
    ).toBe("canonical-react-ds-global-0.29.0.tgz");
  });

  test("tolerates lifecycle noise before and after the JSON on stdout", () => {
    // A future prepack/prepare hook printing on stdout — including bracketed
    // text like "[build] done" before the array and notices after it.
    const stdout = [
      "> @canonical/react-ds-global@0.29.0 prepack",
      "> bun run build",
      "",
      "[build] compiled 3 files",
      PACK_JSON,
      "npm notice total files: 42",
    ].join("\n");
    expect(packFilename({ stdout, stderr: "npm warn something" })).toBe(
      "canonical-react-ds-global-0.29.0.tgz",
    );
  });

  test("handles ] and nested arrays inside the JSON", () => {
    const stdout = JSON.stringify([
      {
        filename: "weird-[0.1.0].tgz",
        files: [{ path: "dist/[id].js" }, { path: 'dist/"q".js' }],
        bundled: [],
      },
    ]);
    expect(packFilename({ stdout, stderr: "" })).toBe("weird-[0.1.0].tgz");
  });

  test("throws when stdout has no JSON array", () => {
    expect(() =>
      packFilename({ stdout: "npm ERR! code EACCES", stderr: "boom" }),
    ).toThrow("no JSON array found");
  });

  test("throws when the entry has no filename", () => {
    expect(() =>
      packFilename({ stdout: '[{"name":"x"}]', stderr: "" }),
    ).toThrow("returned no filename");
  });
});

describe("parsePackJson", () => {
  test("returns the parsed array", () => {
    const parsed = parsePackJson({ stdout: PACK_JSON, stderr: "npm warn x" });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.entryCount).toBe(42);
  });
});
