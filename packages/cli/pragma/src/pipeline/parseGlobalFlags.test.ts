import { describe, expect, it } from "vitest";
import parseGlobalFlags, {
  readRawFormat,
  stripGlobalFlags,
} from "./parseGlobalFlags.js";

describe("parseGlobalFlags", () => {
  it("extracts --llm", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "block",
      "list",
      "--llm",
    ]);
    expect(flags.llm).toBe(true);
  });

  it("extracts --format json", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "--format",
      "json",
      "info",
    ]);
    expect(flags.format).toBe("json");
  });

  it("defaults to text when --format is absent", () => {
    const flags = parseGlobalFlags(["node", "pragma", "info"]);
    expect(flags.format).toBe("text");
  });

  it("accepts the --format=json equals form", () => {
    const flags = parseGlobalFlags(["node", "pragma", "info", "--format=json"]);
    expect(flags.format).toBe("json");
  });

  it("treats an unknown --format value as text", () => {
    expect(
      parseGlobalFlags(["node", "pragma", "info", "--format", "xml"]).format,
    ).toBe("text");
    expect(
      parseGlobalFlags(["node", "pragma", "info", "--format=xml"]).format,
    ).toBe("text");
  });

  it("extracts --verbose", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "--verbose",
      "block",
      "list",
    ]);
    expect(flags.verbose).toBe(true);
  });

  describe("auto-LLM detection", () => {
    const tty = { isTty: true, noAutoLlm: false };
    const piped = { isTty: false, noAutoLlm: false };

    it("stays plain on an interactive terminal", () => {
      expect(parseGlobalFlags(["node", "pragma", "info"], tty).llm).toBe(false);
    });

    it("defaults to llm when stdout is not a TTY", () => {
      expect(parseGlobalFlags(["node", "pragma", "info"], piped).llm).toBe(
        true,
      );
    });

    it("does not auto-enable llm when --format json is requested", () => {
      expect(
        parseGlobalFlags(["node", "pragma", "info", "--format", "json"], piped)
          .llm,
      ).toBe(false);
    });

    it("respects an explicit --llm even on a TTY", () => {
      expect(
        parseGlobalFlags(["node", "pragma", "--llm", "info"], tty).llm,
      ).toBe(true);
    });

    it("honours PRAGMA_NO_AUTO_LLM to stay plain when piped", () => {
      expect(
        parseGlobalFlags(["node", "pragma", "info"], {
          isTty: false,
          noAutoLlm: true,
        }).llm,
      ).toBe(false);
    });
  });
});

describe("stripGlobalFlags", () => {
  it("removes --llm from any position", () => {
    expect(
      stripGlobalFlags(["node", "pragma", "--llm", "tier", "list"]),
    ).toEqual(["node", "pragma", "tier", "list"]);
    expect(
      stripGlobalFlags(["node", "pragma", "tier", "list", "--llm"]),
    ).toEqual(["node", "pragma", "tier", "list"]);
  });

  it("removes --format and its value", () => {
    expect(
      stripGlobalFlags(["node", "pragma", "--format", "json", "info"]),
    ).toEqual(["node", "pragma", "info"]);
    expect(
      stripGlobalFlags(["node", "pragma", "info", "--format", "json"]),
    ).toEqual(["node", "pragma", "info"]);
  });

  it("removes --verbose from any position", () => {
    expect(
      stripGlobalFlags(["node", "pragma", "block", "list", "--verbose"]),
    ).toEqual(["node", "pragma", "block", "list"]);
  });

  it("removes all global flags at once", () => {
    expect(
      stripGlobalFlags([
        "node",
        "pragma",
        "--llm",
        "--verbose",
        "--format",
        "json",
        "block",
        "list",
      ]),
    ).toEqual(["node", "pragma", "block", "list"]);
  });

  it("preserves argv when no global flags present", () => {
    expect(stripGlobalFlags(["node", "pragma", "block", "list"])).toEqual([
      "node",
      "pragma",
      "block",
      "list",
    ]);
  });

  it("removes the equals form of every global flag", () => {
    expect(
      stripGlobalFlags([
        "node",
        "pragma",
        "--llm=",
        "--verbose=",
        "--format=json",
        "block",
        "list",
      ]),
    ).toEqual(["node", "pragma", "block", "list"]);
  });
});

describe("readRawFormat", () => {
  it("reads the space form", () => {
    expect(readRawFormat(["node", "pragma", "--format", "json"])).toBe("json");
  });

  it("reads the equals form", () => {
    expect(readRawFormat(["node", "pragma", "--format=xml"])).toBe("xml");
  });

  it("returns undefined when --format is absent", () => {
    expect(readRawFormat(["node", "pragma", "info"])).toBeUndefined();
  });
});

describe("readRawFormat", () => {
  it("reads the space form", () => {
    expect(readRawFormat(["node", "pragma", "--format", "json"])).toBe("json");
  });

  it("reads the equals form", () => {
    expect(readRawFormat(["node", "pragma", "--format=text"])).toBe("text");
  });

  it("returns undefined when --format is absent", () => {
    expect(readRawFormat(["node", "pragma", "info"])).toBeUndefined();
  });

  it("returns an empty string for a bare --format at end of argv", () => {
    // Not undefined — the caller must reject it rather than fall through to
    // root help with exit code 0.
    expect(readRawFormat(["node", "pragma", "--format"])).toBe("");
  });

  it("returns an empty string when --format is followed by another flag", () => {
    expect(readRawFormat(["node", "pragma", "--format", "--llm"])).toBe("");
  });
});
