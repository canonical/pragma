/**
 * `pragma upgrade` — the async-setup mutation whose sole effect is the exec.
 *
 * The real update command is NEVER spawned: offline / already-latest carry no
 * exec (safe real runs); the update-needed path is asserted via `dryRun(task)`
 * (which mocks the exec and exposes both the plan and the returned value); the
 * exec-failure mapping is proven with a synthetic failing-exec verb. Also covers
 * the `checkRegistryVersion` unit contract and MCP plan-first/confirm.
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

describe("upgrade — exec failure maps to INTERNAL_ERROR (exit 1)", () => {
  it("a failing exec throws, and the boundary maps it to INTERNAL_ERROR", async () => {
    // Mirrors upgrade's exec seam: a failing exec effect propagates a
    // TaskExecutionError that asPragmaError maps to INTERNAL_ERROR (exit 1).
    const failVerb: VerbSpec<Record<string, unknown>, unknown> = {
      path: ["failx"],
      summary: "test",
      params: [],
      output: {
        formatters: {
          plain: () => "",
          llm: () => "",
          json: () => "{}",
        },
      },
      capability: {
        needsStore: false,
        mutates: true,
        mcp: { expose: false, reason: "test" },
      },
      run: (_p, rt) =>
        gen(function* () {
          yield* $(exec("pragma2-nonexistent-binary-xyz", [], rt.cwd));
          return {};
        }) as Task<unknown>,
    };

    let thrown: unknown;
    try {
      await executeVerb(
        failVerb as VerbSpec,
        {},
        REAL,
        bootRuntime(FLAGS_JSON, tmpCwd()),
      );
    } catch (error) {
      thrown = error;
    }
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
