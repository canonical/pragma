import { succeed } from "@canonical/task";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PragmaError } from "../../error/PragmaError.js";
import { bootRuntime } from "../../runtime/boot.js";
import type { GlobalFlags } from "../../runtime/types.js";
import type { ParamSpec, VerbSpec } from "../../spec/types.js";
import { dispatch, executeVerb, extractParams } from "./dispatch.js";

const PLAIN: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const JSON_FLAGS: GlobalFlags = { ...PLAIN, format: "json" };

const passthroughFormatters = {
  plain: (d: unknown) => String(d),
  llm: (d: unknown) => String(d),
  json: (d: unknown) => JSON.stringify(d),
};

const echo: VerbSpec = {
  path: ["probe", "echo"],
  summary: "Echo the message.",
  params: [
    {
      kind: "string",
      name: "message",
      doc: "The message.",
      positional: true,
      required: true,
    },
  ],
  output: { formatters: passthroughFormatters },
  capability: { needsStore: false, mutates: false, mcp: { expose: true } },
  run: async (p) => ({ echoed: (p as { message: string }).message }),
};

const make: VerbSpec = {
  path: ["probe", "make"],
  summary: "Make a thing.",
  params: [],
  output: { formatters: passthroughFormatters },
  capability: { needsStore: false, mutates: true, mcp: { expose: true } },
  run: () => succeed({ made: true }),
};

describe("extractParams", () => {
  it("maps positionals and flags into the param bag", () => {
    const params: ParamSpec[] = [
      {
        kind: "string",
        name: "name",
        doc: "",
        positional: true,
        required: true,
      },
      { kind: "boolean", name: "withHistory", doc: "" },
    ];
    expect(extractParams(params, ["Gadget"], { withHistory: true })).toEqual({
      name: "Gadget",
      withHistory: true,
    });
  });

  it("coerces a number and rejects a non-number", () => {
    const params: ParamSpec[] = [
      { kind: "number", name: "count", doc: "", positional: true },
    ];
    expect(extractParams(params, ["42"], {})).toEqual({ count: 42 });
    expect(() => extractParams(params, ["nan"], {})).toThrow(PragmaError);
  });

  it("rejects an out-of-set enum value", () => {
    const params: ParamSpec[] = [
      { kind: "enum", name: "mode", doc: "", values: ["a", "b"] },
    ];
    expect(() => extractParams(params, [], { mode: "c" })).toThrow(
      /Invalid mode/,
    );
  });

  it("absorbs the remainder into a trailing string[] positional", () => {
    const params: ParamSpec[] = [
      { kind: "string[]", name: "names", doc: "", positional: true },
    ];
    expect(extractParams(params, ["a", "b", "c"], {})).toEqual({
      names: ["a", "b", "c"],
    });
  });
});

describe("executeVerb — reads", () => {
  it("renders plain text", async () => {
    const outcome = await executeVerb(
      echo,
      { message: "hi" },
      { dryRun: false, undo: false, yes: false },
      bootRuntime(PLAIN),
    );
    expect(outcome.stdout).toBe("[object Object]\n");
    expect(outcome.exitCode).toBe(0);
  });

  it("wraps json output in the {ok,data,meta} envelope", async () => {
    const outcome = await executeVerb(
      echo,
      { message: "hi" },
      { dryRun: false, undo: false, yes: false },
      bootRuntime(JSON_FLAGS),
    );
    expect(JSON.parse(outcome.stdout as string)).toEqual({
      ok: true,
      data: { echoed: "hi" },
      meta: {},
    });
  });
});

describe("executeVerb — mutations", () => {
  it("executes a Task and envelopes the result", async () => {
    const outcome = await executeVerb(
      make,
      {},
      { dryRun: false, undo: false, yes: false },
      bootRuntime(JSON_FLAGS),
    );
    expect(JSON.parse(outcome.stdout as string)).toEqual({
      ok: true,
      data: { made: true },
      meta: {},
    });
  });

  it("previews under --dry-run without executing", async () => {
    const outcome = await executeVerb(
      make,
      {},
      { dryRun: true, undo: false, yes: false },
      bootRuntime(PLAIN),
    );
    expect(outcome.stdout).toContain("Dry run");
  });

  it("reports undo count under --undo", async () => {
    const outcome = await executeVerb(
      make,
      {},
      { dryRun: false, undo: true, yes: false },
      bootRuntime(PLAIN),
    );
    expect(outcome.stdout).toBe("Undid 0 step(s).\n");
  });
});

describe("dispatch — errors", () => {
  const savedExit = process.exitCode;
  afterEach(() => {
    process.exitCode = savedExit;
  });

  it("renders a PragmaError to stderr with a mapped exit code", async () => {
    const failing: VerbSpec = {
      ...echo,
      run: async () => {
        throw PragmaError.notFound("thing", "Nope");
      },
    };
    const errs: string[] = [];
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        errs.push(String(chunk));
        return true;
      });
    await dispatch(failing, ["x"], {}, PLAIN);
    spy.mockRestore();
    expect(errs.join("")).toContain('thing "Nope" not found.');
    expect(process.exitCode).toBe(1);
  });
});
