import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it, type Mock, vi } from "vitest";
import { z } from "zod";
import {
  fixtureEffectsModule,
  fixtureModule,
  touchPath,
} from "../../../testing/fixtures/fixtureCapability.js";
import { projectMcp } from "../../../testing/helpers/projectMcp.js";
import { bootRuntime } from "../../runtime/boot.js";
import type {
  GlobalFlags,
  LazyStore,
  PragmaRuntime,
} from "../../runtime/types.js";
import type {
  CapabilityModule,
  ParamSpec,
  VerbSpec,
} from "../../spec/types.js";
import { buildZodSchema, registerVerb } from "./registerVerb.js";

const passthroughFormatters = {
  plain: (d: unknown) => String(d),
  llm: (d: unknown) => String(d),
  json: (d: unknown) => JSON.stringify(d),
};

describe("buildZodSchema (params → zod)", () => {
  const params: ParamSpec[] = [
    {
      kind: "string",
      name: "name",
      doc: "n",
      positional: true,
      required: true,
    },
    { kind: "boolean", name: "withHistory", doc: "h" },
    { kind: "enum", name: "mode", doc: "m", values: ["a", "b"] },
    { kind: "number", name: "count", doc: "c" },
    { kind: "string[]", name: "tags", doc: "t" },
  ];
  const schema = z.object(buildZodSchema(params));

  it("maps each param kind and keys by param name", () => {
    expect(Object.keys(buildZodSchema(params)).sort()).toEqual([
      "count",
      "mode",
      "name",
      "tags",
      "withHistory",
    ]);
  });

  it("makes non-required params optional but keeps required ones", () => {
    expect(schema.safeParse({ name: "x" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("validates enum, number, and array fields", () => {
    expect(schema.safeParse({ name: "x", mode: "z" }).success).toBe(false);
    expect(
      schema.safeParse({
        name: "x",
        mode: "a",
        count: 2,
        tags: ["p"],
        withHistory: true,
      }).success,
    ).toBe(true);
  });

  it("applies a declared default when the field is omitted (CLI parity)", () => {
    const withDefault = z.object(
      buildZodSchema([
        { kind: "string", name: "mode", doc: "m", default: "fast" },
      ]),
    );
    expect(withDefault.parse({})).toEqual({ mode: "fast" });
    expect(withDefault.parse({ mode: "slow" })).toEqual({ mode: "slow" });
  });
});

describe("tool error envelope parity", () => {
  it("wraps a thrown non-PragmaError as the INTERNAL_ERROR envelope", async () => {
    const boom: CapabilityModule = {
      name: "boom",
      verbs: [
        {
          path: ["boom", "go"],
          summary: "Throws a plain Error.",
          params: [],
          output: { formatters: passthroughFormatters },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: true },
          },
          run: async () => {
            throw new Error("kaboom");
          },
        },
      ],
    };
    const mcp = await projectMcp([boom]);
    const envelope = await mcp.callTool("boom_go");
    await mcp.cleanup();

    expect(envelope.ok).toBe(false);
    const error = envelope.error as { code: string; message: string };
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).toContain("kaboom");
  });
});

describe("tool registration", () => {
  it("names tools by path and excludes non-exposed verbs", async () => {
    const mcp = await projectMcp([fixtureModule]);
    const names = (await mcp.listTools()).map((t) => t.name).sort();
    await mcp.cleanup();
    expect(names).toEqual(["widget_list", "widget_make"]);
  });

  it("derives annotations from the capability", async () => {
    const mcp = await projectMcp([fixtureModule]);
    const tools = await mcp.listTools();
    await mcp.cleanup();
    expect(
      tools.find((t) => t.name === "widget_list")?.annotations,
    ).toMatchObject({ readOnlyHint: true, openWorldHint: false });
    expect(
      tools.find((t) => t.name === "widget_make")?.annotations,
    ).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    });
  });

  it("records a reason for a verb withheld from MCP", () => {
    const internal = fixtureModule.verbs.find((v) => v.path[1] === "internal");
    expect(internal?.capability.mcp).toEqual({
      expose: false,
      reason: "internal probe, not an agent tool",
    });
  });
});

describe("real MCP mutation invalidates the shared server-lifetime store (C2 hook)", () => {
  const MCP_FLAGS: GlobalFlags = {
    llm: true,
    autoLlm: false,
    format: "json",
    verbose: false,
  };
  const touchVerb = fixtureEffectsModule.verbs.find(
    (v) => v.path[1] === "touch",
  ) as VerbSpec;

  /**
   * A real `bootRuntime` (real cwd/config), but with its store swapped for one
   * whose `invalidate` is observable. `probe touch` is `needsStore: false`, so
   * `get()` is never called — only the mutate handler's post-run invalidation is.
   */
  function runtimeWithSpyStore(): { runtime: PragmaRuntime; invalidate: Mock } {
    const base = bootRuntime(
      MCP_FLAGS,
      mkdtempSync(join(tmpdir(), "pragma-c2-hook-")),
    );
    const invalidate = vi.fn();
    const store: LazyStore = {
      get booted() {
        return base.store.booted;
      },
      get: base.store.get.bind(base.store),
      invalidate,
    };
    return { runtime: { ...base, store }, invalidate };
  }

  /** Register `touchVerb` and hand back the raw tool handler (no transport). */
  function captureHandler(
    runtime: PragmaRuntime,
  ): (args: Record<string, unknown>) => Promise<CallToolResult> {
    let handler:
      | ((args: Record<string, unknown>) => Promise<CallToolResult>)
      | undefined;
    const server = {
      registerTool: (
        _name: string,
        _config: unknown,
        h: (args: Record<string, unknown>) => Promise<CallToolResult>,
      ) => {
        handler = h;
      },
    } as unknown as McpServer;
    registerVerb(server, touchVerb, runtime);
    if (!handler) throw new Error("registerVerb registered no handler");
    return handler;
  }

  const envelopeOf = (result: CallToolResult): Record<string, unknown> =>
    JSON.parse((result.content[0] as { text: string }).text);

  it("invalidates the store after a real (confirm:true) mutation settles", async () => {
    const { runtime, invalidate } = runtimeWithSpyStore();
    const handler = captureHandler(runtime);
    const name = `c2-confirm-${Date.now()}`;

    const result = await handler({ name, confirm: true });

    // The real run wrote the file AND dropped the shared server-lifetime caches
    // afterwards, so the next read tool re-boots against the new on-disk state.
    expect(existsSync(touchPath(name))).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(envelopeOf(result).ok).toBe(true);
  });

  it("does NOT invalidate the store on a plan-only preview (no confirm)", async () => {
    const { runtime, invalidate } = runtimeWithSpyStore();
    const handler = captureHandler(runtime);
    const name = `c2-preview-${Date.now()}`;

    const result = await handler({ name });

    // A preview touches no disk and leaves the caches intact — no invalidation.
    expect(existsSync(touchPath(name))).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
    expect(envelopeOf(result).meta).toEqual({
      planOnly: true,
      confirmRequired: true,
    });
  });
});
