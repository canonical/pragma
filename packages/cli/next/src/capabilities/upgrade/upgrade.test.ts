/**
 * `pragma upgrade` — the async-setup mutation whose sole effect is the exec.
 *
 * The real update command is NEVER spawned: offline / already-latest carry no
 * exec (safe real runs); the update-needed path is asserted via `dryRun(task)`
 * (which mocks the exec and exposes both the plan and the returned value); the
 * exec-failure mapping is proven with a synthetic verb that RUNS a command
 * exiting nonzero (plus an ENOENT case), exercising the `assertExecOk` guard the
 * real consumers apply. Also covers the `checkRegistryVersion` unit contract and
 * MCP plan-first/confirm.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, dryRun, exec, gen, type Task } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "../../constants.js";
import { asPragmaError } from "../../kernel/error/fromTaskError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { mapExitCode } from "../../kernel/project/cli/exitCodes.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { assertExecOk } from "../shared/assertExecOk.js";
import {
  checkRegistryVersion,
  REGISTRY_TIMEOUT_MS,
} from "../shared/registry.js";
import { runUpgrade } from "./runUpgrade.js";
import type { UpgradeData } from "./types.js";
import { upgradeModule } from "./upgrade.verb.js";

const upgradeVerb = upgradeModule.verbs[0] as VerbSpec;
const FLAGS_JSON: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};
const REAL = { dryRun: false, undo: false, yes: true };
const DRY = { dryRun: true, undo: false, yes: false };

const roots: string[] = [];
const tmpCwd = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pragma2-upgrade-"));
  roots.push(dir);
  return dir;
};

function stubRegistry(latest: string | "offline" | "notok"): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (latest === "offline") throw new Error("network down");
      if (latest === "notok") return { ok: false } as unknown as Response;
      return {
        ok: true,
        json: async () => ({ "dist-tags": { latest } }),
      } as unknown as Response;
    }),
  );
}

let prevXdg: string | undefined;
beforeEach(() => {
  prevXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmpCwd();
});
afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  vi.unstubAllGlobals();
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

async function realData(rt: PragmaRuntime): Promise<UpgradeData> {
  const outcome = await executeVerb(upgradeVerb, {}, REAL, rt);
  return JSON.parse(outcome.stdout as string).data as UpgradeData;
}

describe("checkRegistryVersion — unit contract", () => {
  it("maps channels to dist-tags and encodes the scoped package in the URL", async () => {
    const calls: { url: string; opts: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts: RequestInit) => {
        calls.push({ url, opts });
        return {
          ok: true,
          json: async () => ({
            "dist-tags": {
              latest: "1.0.0",
              experimental: "1.1.0-exp",
              next: "1.2.0-next",
            },
          }),
        } as unknown as Response;
      }),
    );

    expect(
      await checkRegistryVersion("@canonical/pragma-cli", "normal"),
    ).toEqual({ latest: "1.0.0", distTag: "latest" });
    expect(calls[0]?.url).toBe(
      "https://registry.npmjs.org/%40canonical%2Fpragma-cli",
    );
    // The timeout is wired via AbortSignal.timeout(3000).
    expect(calls[0]?.opts.signal).toBeInstanceOf(AbortSignal);
    expect(REGISTRY_TIMEOUT_MS).toBe(3000);

    expect((await checkRegistryVersion("x", "experimental"))?.distTag).toBe(
      "experimental",
    );
    expect((await checkRegistryVersion("x", "experimental"))?.latest).toBe(
      "1.1.0-exp",
    );
    expect((await checkRegistryVersion("x", "prerelease"))?.distTag).toBe(
      "next",
    );
  });

  it("returns undefined on a non-2xx response or an offline error", async () => {
    stubRegistry("notok");
    expect(await checkRegistryVersion("x", "normal")).toBeUndefined();
    stubRegistry("offline");
    expect(await checkRegistryVersion("x", "normal")).toBeUndefined();
  });
});

describe("upgrade — offline & already-latest (no exec)", () => {
  it("offline: no exec, offline data", async () => {
    stubRegistry("offline");
    const data = await realData(bootRuntime(FLAGS_JSON, tmpCwd()));
    expect(data.offline).toBe(true);
    expect(data.executed).toBe(false);
    expect(data.latest).toBeUndefined();
  });

  it("already-latest: no exec, alreadyLatest data", async () => {
    stubRegistry(VERSION);
    const data = await realData(bootRuntime(FLAGS_JSON, tmpCwd()));
    expect(data.alreadyLatest).toBe(true);
    expect(data.executed).toBe(false);
    expect(data.latest).toBe(VERSION);
  });
});

describe("upgrade — update needed", () => {
  it("--dry-run lists the version delta and the Execute command, running nothing", async () => {
    stubRegistry("99.0.0");
    const outcome = await executeVerb(
      upgradeVerb,
      {},
      DRY,
      bootRuntime(FLAGS_JSON, tmpCwd()),
    );
    const plan = JSON.parse(outcome.stdout as string).data.plan as string[];
    expect(plan.some((line) => line.includes(`${VERSION} → 99.0.0`))).toBe(
      true,
    );
    expect(
      plan.some(
        (line) =>
          line.startsWith("Execute:") && line.includes("@canonical/pragma-cli"),
      ),
    ).toBe(true);
  });

  it("the composed task returns executed:true (exec mocked under dry-run)", async () => {
    stubRegistry("99.0.0");
    const task = await runUpgrade(bootRuntime(FLAGS_JSON, tmpCwd()));
    const { value } = dryRun(task);
    expect(value.executed).toBe(true);
    expect(value.latest).toBe("99.0.0");
    expect(value.alreadyLatest).toBe(false);
  });
});

describe("assertExecOk — the exec-exitCode guard", () => {
  it("returns on a zero exit and throws INTERNAL_ERROR (with stderr) on nonzero", () => {
    expect(() =>
      assertExecOk("cmd", { stdout: "", stderr: "", exitCode: 0 }),
    ).not.toThrow();

    let thrown: unknown;
    try {
      assertExecOk("npm i -g @canonical/pragma-cli", {
        stdout: "",
        stderr: "  npm ERR! code EACCES  ",
        exitCode: 13,
      });
    } catch (error) {
      thrown = error;
    }
    const err = asPragmaError(thrown);
    expect(err.code).toBe("INTERNAL_ERROR");
    // Surfaces the command + exit code + the captured stderr (trimmed).
    expect(err.message).toContain("npm i -g @canonical/pragma-cli");
    expect(err.message).toContain("code 13");
    expect(err.message).toContain("npm ERR! code EACCES");
  });
});

describe("upgrade — a failed exec maps to INTERNAL_ERROR (exit 1)", () => {
  // A minimal verb whose sole effect is the given exec seam — the same shape
  // runUpgrade/setupLsp use (exec then assertExecOk), driven through dispatch.
  const failVerbWith = (
    run: (p: Record<string, unknown>, rt: PragmaRuntime) => Task<unknown>,
  ): VerbSpec => {
    const verb: VerbSpec<Record<string, unknown>, unknown> = {
      path: ["failx"],
      summary: "test",
      params: [],
      output: {
        formatters: { plain: () => "", llm: () => "", json: () => "{}" },
      },
      capability: {
        needsStore: false,
        mutates: true,
        mcp: { expose: false, reason: "test" },
      },
      run,
    };
    return verb as VerbSpec;
  };

  const runToError = async (verb: VerbSpec): Promise<unknown> => {
    try {
      await executeVerb(verb, {}, REAL, bootRuntime(FLAGS_JSON, tmpCwd()));
    } catch (error) {
      return error;
    }
    return undefined;
  };

  it("a command that RUNS and exits nonzero is surfaced, not silently succeeded", async () => {
    // The interpreter RESOLVES exec on a nonzero exit (only ENOENT rejects), so
    // the guard the consumers apply (assertExecOk) is what turns a failed
    // install into a failure. Without that guard this verb would return {} —
    // the masked "silent false success" the old ENOENT-only test never caught.
    const thrown = await runToError(
      failVerbWith(
        (_p, rt) =>
          gen(function* () {
            const result = yield* $(
              exec(
                "sh",
                ["-c", "echo boom-from-installer >&2; exit 7"],
                rt.cwd,
              ),
            );
            assertExecOk("sh -c 'exit 7'", result);
            return {};
          }) as Task<unknown>,
      ),
    );
    expect(thrown).toBeDefined();
    const err = asPragmaError(thrown);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(mapExitCode(err.code)).toBe(1);
    // The subprocess's own stderr is surfaced, not discarded.
    expect(err.message).toContain("boom-from-installer");
    expect(err.message).toContain("code 7");
  });

  it("a spawn error (ENOENT) also maps to INTERNAL_ERROR", async () => {
    const thrown = await runToError(
      failVerbWith(
        (_p, rt) =>
          gen(function* () {
            yield* $(exec("pragma2-nonexistent-binary-xyz", [], rt.cwd));
            return {};
          }) as Task<unknown>,
      ),
    );
    expect(thrown).toBeDefined();
    const err = asPragmaError(thrown);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(mapExitCode(err.code)).toBe(1);
  });
});

describe("upgrade — MCP plan-first / confirm", () => {
  it("returns a plan without confirm (needed), and runs safely with confirm when up-to-date", async () => {
    stubRegistry("99.0.0");
    const mcp = await projectMcp([upgradeModule], tmpCwd());
    const plan = await mcp.callTool("upgrade");
    expect(plan.ok).toBe(true);
    expect(plan.meta).toMatchObject({ planOnly: true, confirmRequired: true });
    const planLines = (plan.data as { plan: string[] }).plan;
    expect(planLines.some((line) => line.startsWith("Execute:"))).toBe(true);
    await mcp.cleanup();

    // confirm:true with an up-to-date registry runs for real WITHOUT an exec.
    stubRegistry(VERSION);
    const mcp2 = await projectMcp([upgradeModule], tmpCwd());
    const done = await mcp2.callTool("upgrade", { confirm: true });
    await mcp2.cleanup();
    expect(done.ok).toBe(true);
    expect(done.data).toMatchObject({ alreadyLatest: true, executed: false });
  });
});
