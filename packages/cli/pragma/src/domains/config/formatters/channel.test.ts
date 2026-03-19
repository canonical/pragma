import { describe, expect, it } from "vitest";
import formatters from "./channel.js";

describe("channelFormatters.set", () => {
  const data = { field: "channel", value: "experimental" };

  it("plain renders set message", () => {
    expect(formatters.set.plain(data)).toBe('Set channel to "experimental".');
  });

  it("llm renders set message", () => {
    expect(formatters.set.llm(data)).toBe('Set channel to "experimental".');
  });

  it("json returns valid JSON", () => {
    const parsed = JSON.parse(formatters.set.json(data));
    expect(parsed.field).toBe("channel");
    expect(parsed.value).toBe("experimental");
  });
});

describe("channelFormatters.reset", () => {
  it("plain renders reset message", () => {
    expect(formatters.reset.plain("")).toBe("Reset channel to default.");
  });

  it("llm renders reset message", () => {
    expect(formatters.reset.llm("")).toBe("Reset channel to default.");
  });

  it("json returns valid JSON", () => {
    const parsed = JSON.parse(formatters.reset.json(""));
    expect(parsed.field).toBe("channel");
    expect(parsed.reset).toBe(true);
  });
});

describe("channelFormatters.query", () => {
  it("plain shows current channel", () => {
    expect(formatters.query.plain("prerelease")).toBe(
      "Current channel: prerelease",
    );
  });

  it("llm shows current channel", () => {
    expect(formatters.query.llm("prerelease")).toBe(
      "Current channel: prerelease",
    );
  });

  it("json returns valid JSON", () => {
    const parsed = JSON.parse(formatters.query.json("prerelease"));
    expect(parsed.field).toBe("channel");
    expect(parsed.value).toBe("prerelease");
  });
});
