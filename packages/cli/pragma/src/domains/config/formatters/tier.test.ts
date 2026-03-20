import { describe, expect, it } from "vitest";
import formatters from "./tier.js";

describe("tierFormatters.set", () => {
  const data = { field: "tier", value: "apps/lxd" };

  it("plain renders set message", () => {
    expect(formatters.set.plain(data)).toBe('Set tier to "apps/lxd".');
  });

  it("llm renders set message", () => {
    expect(formatters.set.llm(data)).toBe('Set tier to "apps/lxd".');
  });

  it("json returns valid JSON", () => {
    const parsed = JSON.parse(formatters.set.json(data));
    expect(parsed.field).toBe("tier");
    expect(parsed.value).toBe("apps/lxd");
  });
});

describe("tierFormatters.reset", () => {
  it("plain renders reset message", () => {
    expect(formatters.reset.plain("")).toBe("Reset tier to default.");
  });

  it("llm renders reset message", () => {
    expect(formatters.reset.llm("")).toBe("Reset tier to default.");
  });

  it("json returns valid JSON", () => {
    const parsed = JSON.parse(formatters.reset.json(""));
    expect(parsed.field).toBe("tier");
    expect(parsed.reset).toBe(true);
  });
});

describe("tierFormatters.query", () => {
  it("plain shows current tier when set", () => {
    expect(formatters.query.plain("apps")).toBe("Current tier: apps");
  });

  it("plain shows no tier message when undefined", () => {
    expect(formatters.query.plain(undefined)).toBe(
      "No tier set (all tiers visible).",
    );
  });

  it("llm shows current tier when set", () => {
    expect(formatters.query.llm("apps")).toBe("Current tier: apps");
  });

  it("llm shows no tier message when undefined", () => {
    expect(formatters.query.llm(undefined)).toBe(
      "No tier set (all tiers visible).",
    );
  });

  it("json returns value when set", () => {
    const parsed = JSON.parse(formatters.query.json("apps"));
    expect(parsed.field).toBe("tier");
    expect(parsed.value).toBe("apps");
  });

  it("json returns null value when undefined", () => {
    const parsed = JSON.parse(formatters.query.json(undefined));
    expect(parsed.field).toBe("tier");
    expect(parsed.value).toBeNull();
  });
});
