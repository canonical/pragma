/**
 * C2 (config visibility) at the runtime seam.
 *
 * `bootRuntime` memoizes the layered-config read (`configPromise`) for the
 * invocation. On a long-lived MCP server that memo would strand a stale config
 * after a `config_set` write — subsequent reads keep serving the old value. The
 * fix couples the two server-lifetime memos: `store.invalidate()` also clears
 * the config memo (via the `onInvalidate` hook boot.ts wires), so the next
 * `loadConfig()` re-reads disk. This drives that mechanism directly against the
 * real config reader and an isolated global config file.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootRuntime } from "./boot.js";
import type { GlobalFlags } from "./types.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

describe("bootRuntime config memo — invalidate() re-reads config from disk (C2)", () => {
  let priorXdgConfig: string | undefined;
  let configPath: string;

  beforeEach(() => {
    // Isolate the global config to this test so writes never bleed across tests.
    priorXdgConfig = process.env.XDG_CONFIG_HOME;
    const xdg = mkdtempSync(join(tmpdir(), "pragma-c2-cfg-"));
    process.env.XDG_CONFIG_HOME = xdg;
    mkdirSync(join(xdg, "pragma"), { recursive: true });
    configPath = join(xdg, "pragma", "config.json");
  });

  afterEach(() => {
    if (priorXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = priorXdgConfig;
  });

  it("serves the memoized config until store.invalidate() clears it, then re-reads disk", async () => {
    writeFileSync(configPath, JSON.stringify({ tier: "apps/lxd" }));
    // An empty project dir: only the global layer contributes `tier`.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-c2-proj-"));
    const runtime = bootRuntime(FLAGS, cwd);

    const first = await runtime.loadConfig();
    expect(first.config.tier).toBe("apps/lxd");

    // A mutation changes config on disk...
    writeFileSync(configPath, JSON.stringify({ tier: "apps/vm" }));

    // ...but the per-invocation memo still serves the STALE value (the bug the
    // fix targets on a long-lived server).
    const stale = await runtime.loadConfig();
    expect(stale.config.tier).toBe("apps/lxd");

    // Invalidating the store drops the coupled config memo (onInvalidate)...
    runtime.store.invalidate();

    // ...so the next read re-reads disk and sees the new value.
    const fresh = await runtime.loadConfig();
    expect(fresh.config.tier).toBe("apps/vm");
  });
});
