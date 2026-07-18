import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import type { createRequire } from "node:module";
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
import { lockPath, packDir } from "../../kernel/runtime/paths.js";
import { resolvePackageJson } from "../../kernel/runtime/refs/resolve.js";
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
  const pkg = tmp("pragma-pkg-");
  mkdirSync(join(pkg, "definitions"), { recursive: true });
  writeFileSync(join(pkg, "definitions", "widget.ttl"), TTL);
  return pkg;
}

describe("sources lock round-trip (PROTECTED)", () => {
  it("file source: builds, locks, and --frozen rewrites a byte-identical lock", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
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
    const repo = tmp("pragma-repo-");
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

    const cwd = tmp("pragma-proj-");
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
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    const { runUndo } = await import("@canonical/task/node");
    await runUndo(await buildUpdateTask(runtime, false));
    // Prior lock was absent, so undo removes the file.
    expect(readLock(cwd)).toBeUndefined();
  });
});

describe("sources update — package-declared prefixes (M1)", () => {
  it("compacts a package's own namespace to its declared prefix in the index", async () => {
    // The fixture TTL declares `@prefix ex: <https://ex.test/#>`, but the config
    // carries NO `ex` prefix. Without harvesting the package's own prologue, the
    // index falls back to full URIs (breaking prefixed-type completion and PR3
    // reads); with it, names compact to `ex:Widget` / `ex:one`.
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const result = await runTask(await buildUpdateTask(runtime, false));
    const index = JSON.parse(
      readFileSync(join(packDir(result.contentHash), "index.json"), "utf-8"),
    ) as {
      prefixes: Record<string, string>;
      entities: { name: string; type: string }[];
    };

    // The harvested prefix is persisted (so boot reads the same names).
    expect(index.prefixes.ex).toBe("https://ex.test/#");
    const names = index.entities.map((entity) => entity.name);
    expect(names).toContain("ex:Widget");
    expect(names).toContain("ex:one");
    // No entity NAME leaks a full URI (the pre-fix regression).
    for (const name of names) expect(name).not.toMatch(/^https?:/);
    // The primary type filter key is prefixed too — completion filters on it.
    expect(
      index.entities.find((entity) => entity.name === "ex:one")?.type,
    ).toBe("ex:Widget");
  });
});

describe("sources update — network-free preview (M2)", () => {
  const updateVerb = sourcesModule.verbs[1] as VerbSpec;
  const DRY_RUN = { dryRun: true, undo: false, yes: false };
  // A source that can ONLY be satisfied by a clone. If a preview resolved it,
  // the git clone would fail and the run would error (or hang on the network) —
  // so a clean plan proves nothing was fetched or built.
  const UNREACHABLE = "git+file:///pragma-does-not-exist-42/repo.git#main";

  it("CLI --dry-run previews the refs offline, resolving nothing", async () => {
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-remote", source: UNREACHABLE },
    ]);

    const outcome = await executeVerb(updateVerb, {}, DRY_RUN, runtime);

    // A successful plan — the unreachable clone was never attempted.
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Resolve and build 1 package(s)");
    expect(outcome.stdout).toContain(UNREACHABLE);
    // The one project mutation is previewed, not performed.
    expect(outcome.stdout).toContain("pragma.lock.json");
    expect(readLock(cwd)).toBeUndefined();
    // The store was never even asked for.
    expect(runtime.store.booted).toBe(false);
  });

  it("MCP sources_update without confirm returns a plan, fetching nothing", async () => {
    const cwd = tmp("pragma-proj-");
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      `export default { packages: [{ name: "pkg-remote", source: "${UNREACHABLE}" }] };\n`,
    );

    const mcp = await projectMcp([sourcesModule], cwd);
    const envelope = await mcp.callTool("sources_update"); // no confirm
    await mcp.cleanup();

    expect(envelope.ok).toBe(true);
    expect(envelope.meta).toMatchObject({
      planOnly: true,
      confirmRequired: true,
    });
    const plan = (envelope.data as { plan: string[] }).plan;
    expect(plan.some((line) => line.includes(UNREACHABLE))).toBe(true);
    // Plan-first withheld the write — no lock landed.
    expect(readLock(cwd)).toBeUndefined();
  });
});

describe("sources update — reproducible-or-fail (m5)", () => {
  it("--frozen refuses a package that has no lock entry", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    // No prior lock → nothing to reproduce → refuse rather than silently
    // advance. The throw is raised during setup, before any Task is returned.
    await expect(buildUpdateTask(runtime, true)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readLock(cwd)).toBeUndefined();
  });
});

describe("npm resolution tolerates restrictive exports (m6)", () => {
  it("resolvePackageJson walks up past an exports map hiding ./package.json", () => {
    const pkgDir = tmp("pragma-npm-");
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({
        name: "faux",
        version: "9.9.9",
        exports: { ".": "./index.js" },
      }),
    );
    // Emulate Node throwing ERR_PACKAGE_PATH_NOT_EXPORTED for `<pkg>/package.json`
    // while the bare entry still resolves.
    const require = {
      resolve(request: string): string {
        if (request === "faux/package.json") {
          const err = new Error("no ./package.json export") as Error & {
            code: string;
          };
          err.code = "ERR_PACKAGE_PATH_NOT_EXPORTED";
          throw err;
        }
        if (request === "faux") return join(pkgDir, "index.js");
        throw new Error(`cannot resolve ${request}`);
      },
    } as unknown as ReturnType<typeof createRequire>;

    expect(resolvePackageJson(require, "faux")).toBe(
      join(pkgDir, "package.json"),
    );

    // A genuinely-absent package still yields undefined (→ "not installed").
    const missing = {
      resolve(): string {
        throw new Error("not found");
      },
    } as unknown as ReturnType<typeof createRequire>;
    expect(resolvePackageJson(missing, "faux")).toBeUndefined();
  });
});

describe("sources status CLI-json == MCP tool (PROTECTED)", () => {
  it("a cold store's status is byte-equal on both surfaces", async () => {
    // Both surfaces boot from the SAME cwd + isolated config (default packages,
    // no lock), so the storeless status must be identical.
    const cwd = tmp("pragma-proj-");
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
