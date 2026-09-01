/**
 * SEC-2 jail unit pins — `assertInsideWorkspace` driven DIRECTLY.
 *
 * Since the round-9 reorder the shared prompt validators consume the
 * absolute and `..` classes upstream on every production path, so the
 * integration suites can no longer reach those jail branches. These cells
 * pin the jail's own three refusals (absolute, `..` escape, symlink
 * resolution) and its cwd-identity property — the root it measures against
 * is exactly the `cwd` it is HANDED, never the ambient process directory —
 * independently of which layer refuses first in production.
 */

import { mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { assertInsideWorkspace } from "./pathJail.js";

const freshDir = (): string => mkdtempSync(join(tmpdir(), "pragma-pathjail-"));

/** The error a call throws (fails the cell when it does not throw). */
function thrown(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return expect.fail("assertInsideWorkspace did not throw");
}

describe("assertInsideWorkspace — the jail's own branches (PROTECTED)", () => {
  it("rejects an absolute path", () => {
    const error = thrown(() =>
      assertInsideWorkspace("componentPath", "/evil/Widget", freshDir()),
    );
    expect(error).toBeInstanceOf(PragmaError);
    expect(error).toMatchObject({
      code: "INVALID_INPUT",
      message: 'Invalid componentPath "/evil/Widget".',
      recovery: { message: "Use a path relative to the current directory." },
    });
  });

  it("rejects a `..` escape", () => {
    const error = thrown(() =>
      assertInsideWorkspace("componentPath", "../evil/Widget", freshDir()),
    );
    expect(error).toBeInstanceOf(PragmaError);
    expect(error).toMatchObject({
      code: "INVALID_INPUT",
      message: 'Invalid componentPath "../evil/Widget".',
      recovery: { message: "The path must stay inside the workspace." },
    });
  });

  it("rejects a symlink resolving outside the workspace", () => {
    const root = freshDir();
    const outside = freshDir();
    symlinkSync(outside, join(root, "link"));
    const error = thrown(() =>
      assertInsideWorkspace("appPath", "link/app", root),
    );
    expect(error).toBeInstanceOf(PragmaError);
    expect(error).toMatchObject({
      code: "INVALID_INPUT",
      message: 'Invalid appPath "link/app".',
      recovery: { message: "The path resolves outside the workspace." },
    });
  });

  it("jails against the GIVEN cwd, not the ambient one: same value, two cwds", () => {
    // `link/Widget` resolves through a symlink OUT of `jailed` but is an
    // ordinary nested path under `plain` — so the verdict flips with the
    // handed cwd alone, while process.cwd() (neither dir) never moves.
    const jailed = freshDir();
    const plain = freshDir();
    const outside = freshDir();
    symlinkSync(outside, join(jailed, "link"));
    expect(process.cwd()).not.toBe(jailed);
    expect(process.cwd()).not.toBe(plain);

    expect(() =>
      assertInsideWorkspace("componentPath", "link/Widget", jailed),
    ).toThrow('Invalid componentPath "link/Widget".');
    expect(() =>
      assertInsideWorkspace("componentPath", "link/Widget", plain),
    ).not.toThrow();
  });
});
