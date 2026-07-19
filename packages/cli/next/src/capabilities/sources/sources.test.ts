import { execFileSync } from "node:child_process";
import {
  existsSync,
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "../../constants.js";
import type { ConfigLayers, PackageEntry } from "../../kernel/config/types.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
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
import { discoverSkills } from "../skill/discover.js";
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

describe("sources update — data-failure classification (U6)", () => {
  /** A local package whose definitions TTL is malformed (bad triple). */
  function badFilePackage(): string {
    const pkg = tmp("pragma-badpkg-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    // A predicate with no object → ke/Oxigraph throws a Turtle parser error,
    // exactly the class that used to escape as INTERNAL_ERROR "report this issue".
    writeFileSync(
      join(pkg, "definitions", "broken.ttl"),
      "@prefix ex: <https://ex.test/#> .\nex:One a ex:Widget .\nex:Two ex:brokenPredicate .\n",
    );
    return pkg;
  }

  it("classifies a bad triple as a NAMED data error, not 'report this issue'", async () => {
    const pkg = badFilePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "bad-pkg", source: `file://${pkg}` },
    ]);

    let caught: unknown;
    try {
      await buildUpdateTask(runtime, false);
    } catch (error) {
      caught = error;
    }

    // A classified data error (exit-1 CONFIG_ERROR), NOT INTERNAL_ERROR.
    expect(caught).toBeInstanceOf(PragmaError);
    const err = caught as PragmaError;
    expect(err.code).toBe("CONFIG_ERROR");
    // It NAMES the offending package/file …
    expect(err.message).toContain("bad-pkg/definitions/broken.ttl");
    // … carries the parser's own detail …
    expect(err.message.toLowerCase()).toContain("parser error");
    // … and is NOT the internal-bug "please report this issue" path.
    expect(err.message).not.toContain("Internal error");
    expect(err.recovery?.message ?? "").not.toContain("report this issue");
    // The recovery points the user at a runnable, useful next step.
    expect(err.recovery?.cli).toBe("pragma sources update --verbose");
    // Nothing was locked on failure.
    expect(readLock(cwd)).toBeUndefined();
  });

  it("classifies a git clone failure, naming the package (not INTERNAL)", async () => {
    // A git+file:// ref to a path that does not exist → the clone fails
    // immediately (hermetic, no network). On base this raw execFileSync throw
    // escapes as INTERNAL_ERROR "report this issue"; it must be a named data error.
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      {
        name: "pkg-remote",
        source: "git+file:///pragma-nope-42/repo.git#main",
      },
    ]);

    let caught: unknown;
    try {
      await buildUpdateTask(runtime, false);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    const err = caught as PragmaError;
    expect(err.code).toBe("CONFIG_ERROR");
    expect(err.message).toContain("pkg-remote");
    expect(err.message).not.toContain("Internal error");
    expect(readLock(cwd)).toBeUndefined();
  });

  it("names the SPECIFIC bad file among several good ones", async () => {
    const pkg = tmp("pragma-badpkg-mixed-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    writeFileSync(join(pkg, "definitions", "aaa-good.ttl"), TTL);
    writeFileSync(
      join(pkg, "definitions", "zzz-bad.ttl"),
      "@prefix ex: <https://ex.test/#> .\nex:Broken ex:noObject .\n",
    );
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [{ name: "mix", source: `file://${pkg}` }]);

    await expect(buildUpdateTask(runtime, false)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    let caught: unknown;
    try {
      await buildUpdateTask(runtime, false);
    } catch (error) {
      caught = error;
    }
    // Per-source isolation pins the bad file, not the good sibling.
    expect((caught as PragmaError).message).toContain(
      "mix/definitions/zzz-bad.ttl",
    );
    expect((caught as PragmaError).message).not.toContain("aaa-good.ttl");
  });
});

describe("sources update — hidden files and --skip-invalid", () => {
  const BAD_TTL =
    "@prefix ex: <https://ex.test/#> .\nex:Broken ex:noObject .\n";

  /** The good widget package plus one extra definitions file. */
  function packageWithExtra(name: string, content: string): string {
    const pkg = filePackage();
    writeFileSync(join(pkg, "definitions", name), content);
    return pkg;
  }

  it("skips dot-prefixed files rather than ingesting them (hidden artifacts)", async () => {
    // A malformed `.hidden.ttl` beside the good widget.ttl: on base the walker
    // ingests it and the build fails; hidden files must be skipped entirely.
    const pkg = packageWithExtra(".hidden.ttl", BAD_TTL);
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const result = await runTask(await buildUpdateTask(runtime, false));
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readLock(cwd)?.packs).toHaveLength(1);
  });

  it("without --skip-invalid, one malformed source fails the whole update", async () => {
    const pkg = packageWithExtra("bad.ttl", BAD_TTL);
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await expect(buildUpdateTask(runtime, false, false)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readLock(cwd)).toBeUndefined();
  });

  it("with --skip-invalid, drops the bad source, warns loudly, and builds from the rest", async () => {
    const pkg = packageWithExtra("bad.ttl", BAD_TTL);
    const cwd = tmp("pragma-proj-");
    const reports: string[] = [];
    const runtime: PragmaRuntime = {
      ...runtimeFor(cwd, [{ name: "pkg-a", source: `file://${pkg}` }]),
      report: (message: string) => reports.push(message),
    };

    const result = await runTask(await buildUpdateTask(runtime, false, true));
    // Built from the good widget.ttl, not aborted.
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readLock(cwd)?.packs).toHaveLength(1);
    // Loud per-source warning names the dropped file …
    expect(
      reports.some(
        (r) => r.includes("skipped invalid source") && r.includes("bad.ttl"),
      ),
    ).toBe(true);
    // … plus a summary of how many were dropped.
    expect(reports.some((r) => /Skipped 1 invalid source/.test(r))).toBe(true);
  });

  it("with --skip-invalid, still errors when EVERY source is invalid", async () => {
    const pkg = tmp("pragma-allbad-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    writeFileSync(join(pkg, "definitions", "bad.ttl"), BAD_TTL);
    const cwd = tmp("pragma-proj-");
    const runtime: PragmaRuntime = {
      ...runtimeFor(cwd, [{ name: "pkg-a", source: `file://${pkg}` }]),
      report: () => {},
    };
    await expect(buildUpdateTask(runtime, false, true)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readLock(cwd)).toBeUndefined();
  });
});

describe("sources update — progress streaming (U7/U11)", () => {
  const updateVerb = sourcesModule.verbs[1] as VerbSpec;

  /** Capture everything written to stderr while `fn` runs. */
  async function captureStderr(fn: () => Promise<void>): Promise<string> {
    const lines: string[] = [];
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        lines.push(typeof chunk === "string" ? chunk : chunk.toString());
        return true;
      });
    try {
      await fn();
    } finally {
      spy.mockRestore();
    }
    return lines.join("");
  }

  it("streams stage lines to stderr during a real update", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const stderr = await captureStderr(async () => {
      const outcome = await executeVerb(updateVerb, {}, NO_MUT, runtime);
      expect(outcome.exitCode).toBe(0);
    });

    // The clone/parse/build phases each announce themselves (no more silence).
    expect(stderr).toContain("Reading pkg-a");
    expect(stderr).toContain("Building store from 1 source(s)");
    // Built fresh or reused from cache — either way the phase is reported.
    expect(stderr).toMatch(/(Built|Reused) store/);
    // Non-verbose omits the per-file lines.
    expect(stderr).not.toContain("parse pkg-a/definitions/widget.ttl");
  });

  it("--verbose adds a line per source file", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime: PragmaRuntime = {
      ...runtimeFor(cwd, [{ name: "pkg-a", source: `file://${pkg}` }]),
      globalFlags: { ...FLAGS, verbose: true },
    };

    const stderr = await captureStderr(async () => {
      await executeVerb(updateVerb, {}, NO_MUT, runtime);
    });

    expect(stderr).toContain("parse pkg-a/definitions/widget.ttl");
  });
});

describe("sources update — installs package skills (U10)", () => {
  let savedDataHome: string | undefined;
  let dataHome: string;

  /** A local package that also ships `skills/<name>/SKILL.md`. */
  function skillPackage(skillName: string): string {
    const pkg = filePackage(); // definitions/widget.ttl → the build succeeds
    const skillDir = join(pkg, "skills", skillName);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---\nname: ${skillName}\ndescription: From a package.\n---\nBody.`,
    );
    return pkg;
  }

  beforeEach(() => {
    savedDataHome = process.env.XDG_DATA_HOME;
    dataHome = tmp("pragma-datahome-");
    process.env.XDG_DATA_HOME = dataHome;
  });
  afterEach(() => {
    if (savedDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedDataHome;
  });

  it("symlinks a package skill into the installed root so `skill list` finds it", async () => {
    const pkg = skillPackage("foo");
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    await runTask(await buildUpdateTask(runtime, false));

    // Installed as a symlink into $XDG_DATA_HOME/pragma/skills …
    const linked = join(dataHome, "pragma", "skills", "foo");
    expect(existsSync(linked)).toBe(true);
    // … and discovery now sees it.
    expect(discoverSkills(cwd).map((s) => s.name)).toContain("foo");
  });

  it("keeps project .pragma/skills precedence over an installed same-name skill", async () => {
    const pkg = skillPackage("shared");
    const cwd = tmp("pragma-proj-");
    const projSkill = join(cwd, ".pragma", "skills", "shared");
    mkdirSync(projSkill, { recursive: true });
    writeFileSync(
      join(projSkill, "SKILL.md"),
      "---\nname: shared\ndescription: PROJECT copy.\n---\n",
    );

    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await runTask(await buildUpdateTask(runtime, false));

    const shared = discoverSkills(cwd).filter((s) => s.name === "shared");
    expect(shared).toHaveLength(1);
    expect(shared[0]?.description).toBe("PROJECT copy.");
  });

  it("is reversible — undo removes the installed skill symlink", async () => {
    const pkg = skillPackage("bar");
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    const { runUndo } = await import("@canonical/task/node");
    await runUndo(await buildUpdateTask(runtime, false));

    expect(existsSync(join(dataHome, "pragma", "skills", "bar"))).toBe(false);
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
