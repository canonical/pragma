/**
 * `commandOf` reads BOTH registered entry shapes.
 *
 * A harness whose schema requires `command` to be an argv array (OpenCode)
 * carries the executable in the first element; a string-valued `command` IS the
 * executable. Reading only the string form made doctor skip an entry `setup`
 * had just written correctly — and report no command-based servers on a fully
 * configured machine. The two shapes must resolve to the same executable, which
 * is what these cases pin.
 */

import { describe, expect, it } from "vitest";
import { commandOf } from "./mcpCommand.js";

describe("commandOf — one executable, either entry shape", () => {
  it("reads a string command", () => {
    expect(commandOf({ command: "pragma", args: ["mcp", "serve"] })).toBe(
      "pragma",
    );
  });

  it("reads the executable out of an argv array", () => {
    expect(commandOf({ command: ["pragma", "mcp", "serve"] })).toBe("pragma");
  });

  it("skips the leading empty element rather than returning it", () => {
    expect(commandOf({ command: ["", "pragma"] })).toBe("pragma");
  });

  it("has no command for an HTTP entry", () => {
    expect(commandOf({ type: "http", url: "https://example.test" })).toBe(
      undefined,
    );
  });

  it("has no command for an empty string, an empty array, or a non-entry", () => {
    expect(commandOf({ command: "" })).toBe(undefined);
    expect(commandOf({ command: [] })).toBe(undefined);
    expect(commandOf(null)).toBe(undefined);
    expect(commandOf("pragma")).toBe(undefined);
  });
});
