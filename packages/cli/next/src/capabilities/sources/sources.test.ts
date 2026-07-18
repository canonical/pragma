import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTask } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { VERSION } from "../../constants.js";
import type { ConfigLayers, PackageEntry } from "../../kernel/config/types.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { createQueryFacade } from "../../kernel/runtime/facade.js";
import { readLock } from "../../kernel/runtime/lock.js";
import { lockPath } from "../../kernel/runtime/paths.js";
import { createLazyStore } from "../../kernel/runtime/store.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { sourcesModule } from "./index.js";
import { buildUpdateTask } from "./runUpdate.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const flagsJson: GlobalFlags = { ...FLAGS, format: "json" };
const NO_MUT = { dryRun: false, undo: false, yes: false };
const statusVerb = sourcesModule.verbs[0] as VerbSpec;

const TTL = `@prefix ex: <https://ex.test/#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
ex:Widget a owl:Class ; rdfs:label "Widget" .
ex:one a ex:Widget ; rdfs:label "One" .
`;

let roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

/** A runtime whose config is the given package list (no config files needed). */
function runtimeFor(cwd: string, packages: PackageEntry[]): PragmaRuntime {
  const layers: ConfigLayers = {
    config: { channel: "normal", packages },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packages: "project",
      stories: "default",
      prefixes: "default",
      prompts: "default",
    },
    global: { path: "/nonexistent", exists: false },
    project: { exists: false },
  };
  const loadConfig = async (): Promise<ConfigLayers> => layers;
  const store = createLazyStore({ cwd, loadConfig });
  return {
    cwd,
    version: VERSION,
    globalFlags: FLAGS,
    loadConfig,
    store,
    query: createQueryFacade(store),
  };
}

beforeEach(() => {
  roots = [];
});
afterEach(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

/** A local package directory with a definitions TTL. */
function filePackage(): string {
  const pkg = tmp("pragma2-pkg-");
  mkdirSync(join(pkg, "definitions"), { recursive: true });
  writeFileSync(join(pkg, "definitions", "widget.ttl"), TTL);
  return pkg;
}

describe("sources lock round-trip (PROTECTED)", () => {
  it("file source: builds, locks, and --frozen rewrites a byte-identical lock", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma2-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const result = await runTask(await buildUpdateTask(runtime, false));
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);

    const lock = readLock(cwd);
    expect(lock?.packs).toHaveLength(1);
    expect(lock?.packs[0]?.name).toBe("pkg-a");
    expect(lock?.packs[0]?.resolved).toBe(pkg);
    expect(lock?.contentHash).toBe(result.contentHash);

    const firstBytes = readFileSync(lockPath(cwd), "utf-8");
    // A --frozen re-run reproduces the locked state byte-for-byte.
    await runTask(await buildUpdateTask(runtime, true));
    expect(readFileSync(lockPath(cwd), "utf-8")).toBe(firstBytes);
  });

  it("git source: resolves and locks a commit SHA, --frozen pins it", async () => {
    const repo = tmp("pragma2-repo-");
    const git = (args: string[]) =>
      execFileSync("git", args, {
        cwd: repo,
        stdio: "pipe",
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "t",
          GIT_AUTHOR_EMAIL: "t@t",
          GIT_COMMITTER_NAME: "t",
          GIT_COMMITTER_EMAIL: "t@t",
        },
      });
    git(["init", "-b", "main"]);
    mkdirSync(join(repo, "definitions"), { recursive: true });
    writeFileSync(join(repo, "definitions", "widget.ttl"), TTL);
    git(["add", "-A"]);
    git(["commit", "-m", "init"]);

    const cwd = tmp("pragma2-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-git", source: `git+file://${repo}#main` },
    ]);

    await runTask(await buildUpdateTask(runtime, false));
    const lock = readLock(cwd);
    expect(lock?.packs[0]?.resolved).toMatch(/^[0-9a-f]{40}$/);

    const firstBytes = readFileSync(lockPath(cwd), "utf-8");
    await runTask(await buildUpdateTask(runtime, true));
    expect(readFileSync(lockPath(cwd), "utf-8")).toBe(firstBytes);
  });

  it("undo restores the prior lock (no prior → removed)", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma2-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    const { runUndo } = await import("@canonical/task/node");
    await runUndo(await buildUpdateTask(runtime, false));
    // Prior lock was absent, so undo removes the file.
    expect(readLock(cwd)).toBeUndefined();
  });
});

describe("sources status CLI-json == MCP tool (PROTECTED)", () => {
  it("a cold store's status is byte-equal on both surfaces", async () => {
    // Both surfaces boot from the SAME cwd + isolated config (default packages,
    // no lock), so the storeless status must be identical.
    const cwd = tmp("pragma2-proj-");
    const cli = await executeVerb(
      statusVerb,
      {},
      NO_MUT,
      bootRuntime(flagsJson, cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([sourcesModule], cwd);
    const mcpEnvelope = await mcp.callTool("sources_status");
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(cliEnvelope.ok).toBe(true);
    expect((cliEnvelope.data as { lockPresent: boolean }).lockPresent).toBe(
      false,
    );
    expect((cliEnvelope.data as { cached: boolean }).cached).toBe(false);
  });
});
