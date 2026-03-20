import { spawn } from "node:child_process";
import { unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import computeSocketPath from "./computeSocketPath.js";
import waitForSocket from "./waitForSocket.js";

const hasBun = typeof globalThis.Bun !== "undefined";

const BIN_PATH = resolve(import.meta.dirname, "../bin.ts");
const cwd = process.cwd();
const socketPath = computeSocketPath(cwd);

function cleanSocket(): void {
  try {
    unlinkSync(socketPath);
  } catch {
    // May not exist.
  }
}

afterEach(() => {
  cleanSocket();
});

describe.skipIf(!hasBun)("startCompletionsServer", () => {
  it("starts, accepts a query, and returns noun completions", async () => {
    cleanSocket();

    const { default: querySocket } = await import("./querySocket.js");

    const server = spawn("bun", ["run", BIN_PATH, "_completions-server"], {
      stdio: "ignore",
      cwd,
      detached: true,
    });

    try {
      const ready = await waitForSocket(socketPath, 10_000);
      expect(ready).toBe(true);

      const result = await querySocket(socketPath, "");
      expect(result).toContain("component");
      expect(result).toContain("standard");
    } finally {
      server.kill();
      cleanSocket();
    }
  }, 15_000);

  it("returns verb completions for a noun with trailing space", async () => {
    cleanSocket();

    const { default: querySocket } = await import("./querySocket.js");

    const server = spawn("bun", ["run", BIN_PATH, "_completions-server"], {
      stdio: "ignore",
      cwd,
      detached: true,
    });

    try {
      const ready = await waitForSocket(socketPath, 10_000);
      expect(ready).toBe(true);

      const result = await querySocket(socketPath, "component ");
      expect(result).toContain("list");
      expect(result).toContain("get");
    } finally {
      server.kill();
      cleanSocket();
    }
  }, 15_000);
});
