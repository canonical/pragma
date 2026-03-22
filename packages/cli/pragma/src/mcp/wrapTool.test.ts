import { describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { estimateTokens, serializeErrorPayload, wrapTool } from "./wrapTool.js";

const stubRuntime = {
  store: {} as PragmaRuntime["store"],
  config: { tier: undefined, channel: "normal" },
  cwd: "/test",
  dispose: () => {},
} as PragmaRuntime;

function parseEnvelope(result: { content: unknown[] }): unknown {
  const first = result.content[0] as { type: string; text: string };
  return JSON.parse(first.text);
}

// ---------------------------------------------------------------------------
// wrapTool
// ---------------------------------------------------------------------------

describe("wrapTool", () => {
  it("wraps data payload in success envelope", async () => {
    const handler = wrapTool(stubRuntime, async () => ({
      data: [{ name: "Button" }],
      meta: { count: 1, filters: { tier: "global" } },
    }));

    const result = await handler({});
    const envelope = parseEnvelope(result) as Record<string, unknown>;

    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual([{ name: "Button" }]);
    expect(envelope.meta).toEqual({ count: 1, filters: { tier: "global" } });
  });

  it("defaults meta to empty object when omitted", async () => {
    const handler = wrapTool(stubRuntime, async () => ({
      data: { name: "Button" },
    }));

    const result = await handler({});
    const envelope = parseEnvelope(result) as Record<string, unknown>;

    expect(envelope.ok).toBe(true);
    expect(envelope.meta).toEqual({});
  });

  it("wraps condensed payload in condensed envelope", async () => {
    const handler = wrapTool(stubRuntime, async () => ({
      condensed: true as const,
      text: "## Components\n- Button",
      tokens: "~50",
    }));

    const result = await handler({});
    const envelope = parseEnvelope(result) as Record<string, unknown>;

    expect(envelope.ok).toBe(true);
    expect(envelope.condensed).toBe(true);
    expect(envelope.text).toBe("## Components\n- Button");
    expect(envelope.tokens).toBe("~50");
    expect(envelope).not.toHaveProperty("data");
  });

  it("serializes PragmaError into error envelope", async () => {
    const handler = wrapTool(stubRuntime, async () => {
      throw PragmaError.notFound("component", "Buton", {
        suggestions: ["Button"],
        recovery: "pragma component list",
      });
    });

    const result = await handler({});
    expect(result.isError).toBe(true);

    const envelope = parseEnvelope(result) as {
      ok: boolean;
      error: Record<string, unknown>;
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("ENTITY_NOT_FOUND");
    expect(envelope.error.message).toContain("Buton");
    expect(envelope.error.suggestions).toEqual(["Button"]);
  });

  it("rethrows unknown errors", async () => {
    const handler = wrapTool(stubRuntime, async () => {
      throw new TypeError("unexpected");
    });

    await expect(handler({})).rejects.toThrow("unexpected");
  });

  it("passes runtime and params to handler", async () => {
    const handler = wrapTool(stubRuntime, async (rt, params) => ({
      data: { cwd: rt.cwd, name: params.name },
    }));

    const result = await handler({ name: "Button" });
    const envelope = parseEnvelope(result) as { data: Record<string, unknown> };

    expect(envelope.data.cwd).toBe("/test");
    expect(envelope.data.name).toBe("Button");
  });
});

// ---------------------------------------------------------------------------
// serializeErrorPayload
// ---------------------------------------------------------------------------

describe("serializeErrorPayload", () => {
  it("includes code and message", () => {
    const error = PragmaError.emptyResults("component");
    const payload = serializeErrorPayload(error);

    expect(payload.code).toBe("EMPTY_RESULTS");
    expect(payload.message).toContain("component");
  });

  it("includes filters when present", () => {
    const error = PragmaError.emptyResults("component", {
      filters: { tier: "global" },
    });
    const payload = serializeErrorPayload(error);

    expect(payload.filters).toEqual({ tier: "global" });
  });

  it("includes validOptions when present", () => {
    const error = PragmaError.invalidInput("channel", "beta", {
      validOptions: ["normal", "experimental"],
    });
    const payload = serializeErrorPayload(error);

    expect(payload.validOptions).toEqual(["normal", "experimental"]);
  });

  it("omits empty suggestions", () => {
    const error = PragmaError.storeError("fail");
    const payload = serializeErrorPayload(error);

    expect(payload).not.toHaveProperty("suggestions");
  });
});

// ---------------------------------------------------------------------------
// estimateTokens
// ---------------------------------------------------------------------------

describe("estimateTokens", () => {
  it("estimates ~1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe("~1");
    expect(estimateTokens("abcdefgh")).toBe("~2");
    expect(estimateTokens("a")).toBe("~1");
  });

  it("rounds up", () => {
    expect(estimateTokens("abcde")).toBe("~2");
  });
});
