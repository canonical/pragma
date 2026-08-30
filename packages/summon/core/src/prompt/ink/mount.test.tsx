/**
 * The mounted session's DISPOSAL contract: one disposal, memoized, resolving
 * only after the final frame is flushed. A boolean guard here once let a
 * second concurrent `dispose()` resolve immediately — before the first had
 * flushed — so a caller that awaited it could print into a still-mounted UI.
 *
 * Mounting for real needs a raw-mode-capable stdin (the wizard's `useInput`
 * throws without one) and writes its frames to stderr; both are stubbed for
 * the duration of the test and restored after.
 */

import { Console } from "node:console";
import { pure } from "@canonical/task";
import { afterEach, describe, expect, it, vi } from "vitest";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import { mountPromptSession } from "./mount.js";

const gen: GeneratorDefinition = {
  meta: { name: "g", displayName: "g", description: "d", version: "1.0.0" },
  prompts: [],
  generate: () => pure(undefined),
};

/** Make `process.stdin` claim raw-mode support; returns the restore. */
function stubRawModeStdin(): () => void {
  const stdin = process.stdin as NodeJS.ReadStream & {
    isTTY?: boolean;
    setRawMode?: (mode: boolean) => NodeJS.ReadStream;
  };
  const prevIsTTY = stdin.isTTY;
  const prevSetRawMode = stdin.setRawMode;
  stdin.isTTY = true;
  stdin.setRawMode = () => stdin;
  return () => {
    stdin.isTTY = prevIsTTY;
    stdin.setRawMode = prevSetRawMode;
  };
}

describe("mountPromptSession disposal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is memoized: concurrent and repeated dispose() share ONE disposal", async () => {
    const restoreStdin = stubRawModeStdin();
    // Swallow the Ink frames — the session renders to the real stderr.
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    // Vitest swaps in a console with no Console constructor; Ink patches the
    // console on mount and needs the real one.
    const patched = console as unknown as { Console?: unknown };
    const prevConsole = patched.Console;
    patched.Console = Console;
    try {
      const session = mountPromptSession(gen);
      const first = session.dispose();
      const second = session.dispose();
      // The SAME promise, not a fast-path void: a second concurrent caller
      // must wait for the same final-frame flush the first is waiting for.
      expect(second).toBe(first);
      await expect(first).resolves.toBeUndefined();
      // After settlement it stays memoized — no second unmount is attempted.
      expect(session.dispose()).toBe(first);
    } finally {
      patched.Console = prevConsole;
      restoreStdin();
    }
  });
});
