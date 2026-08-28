import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import type { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTask } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "../../constants.js";
import type {
  ConfigLayers,
  PackDeclaration,
} from "../../kernel/config/types.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { createQueryFacade } from "../../kernel/runtime/facade.js";
import { readManifest } from "../../kernel/runtime/graphpack/manifest.js";
import {
  activePackPath,
  packDir,
  readActivePack,
} from "../../kernel/runtime/paths.js";
import {
  detectPrefixClashes,
  resolvePackageJson,
} from "../../kernel/runtime/refs/resolve.js";
import { createLazyStore } from "../../kernel/runtime/store.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { discoverSkills } from "../skill/discover.js";
import { collectStatus } from "./collectStatus.js";
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

/** A runtime whose config is the given pack list (no config files needed). */
function runtimeFor(cwd: string, packs: PackDeclaration[]): PragmaRuntime {
  const layers: ConfigLayers = {
    config: { channel: "normal", packs },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packs: "project",
      stories: "default",
      prefixes: "default",
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

describe("sources update round-trip (PROTECTED)", () => {
  it("file source: builds and points the project at the built pack", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const result = await runTask(await buildUpdateTask(runtime));
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.packs).toEqual([
      { name: "pkg-a", resolved: pkg, sourceCount: 1, storyCount: 0 },
    ]);
    // The pointer the next boot reads names exactly the pack just built.
    expect(readActivePack(cwd)).toBe(result.contentHash);
  });

  it("git source: resolves the ref to a commit SHA", async () => {
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

    const result = await runTask(await buildUpdateTask(runtime));
    const sha = result.packs.at(0)?.resolved;
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    expect(readActivePack(cwd)).toBe(result.contentHash);
    // The revision reaches the manifest's provenance label, which is the only
    // place `sources status` and `doctor` can read it from now that no lock
    // records it. Same `<name>@<kind>:<resolved>` shape the bundler writes.
    expect(readManifest(packDir(result.contentHash))?.sourceRef).toBe(
      `pkg-git@git:${sha}`,
    );
  });

  it("a re-run over an unchanged source leaves the pointer byte-identical (L1)", async () => {
    // On base the lock file carried a `resolvedAt` timestamp, so a no-op re-run
    // rewrote it and dirtied the tree. The pointer holds only the content hash,
    // which is a pure function of the sources — so this is now true by
    // construction. The guard stays because it is the property users cared
    // about: repeating an update changes nothing when nothing changed.
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await runTask(await buildUpdateTask(runtime));
    const firstBytes = readFileSync(activePackPath(cwd), "utf-8");
    await runTask(await buildUpdateTask(runtime));
    expect(readFileSync(activePackPath(cwd), "utf-8")).toBe(firstBytes);
  });

  it("follows a symlinked .ttl into the build (L6)", async () => {
    // pnpm / workspace trees symlink their sources; Dirent.isFile is false for a
    // symlink, so on base the only `.ttl` was skipped → 0 sources → the empty
    // build. Following the link ingests it and the build succeeds.
    const pkg = tmp("pragma-symlink-pkg-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    const realTtl = join(pkg, "real.ttl");
    writeFileSync(realTtl, TTL);
    symlinkSync(realTtl, join(pkg, "definitions", "linked.ttl"));
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const result = await runTask(await buildUpdateTask(runtime));
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readActivePack(cwd)).toBe(result.contentHash);
  });

  it("does not recurse into a symlinked directory cycle (L6 safety)", async () => {
    // The L6 fix follows symlinked FILES but must NOT recurse into a symlinked
    // DIRECTORY: a link to an ancestor dir is a cycle that, if walked, recurses
    // without bound → a stack-overflow RangeError (an INTERNAL "report").
    // The real `.ttl` is still ingested and the build completes.
    const pkg = tmp("pragma-symlink-cycle-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    writeFileSync(join(pkg, "definitions", "widget.ttl"), TTL);
    // `definitions/loop` → `definitions` (its own parent): a symlink cycle.
    symlinkSync(join(pkg, "definitions"), join(pkg, "definitions", "loop"));
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    const result = await runTask(await buildUpdateTask(runtime));
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readActivePack(cwd)).toBe(result.contentHash);
  });

  it("undo removes the pointer when the project had none before", async () => {
    const pkg = filePackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    const { runUndo } = await import("@canonical/task/node");
    await runUndo(await buildUpdateTask(runtime));
    expect(readActivePack(cwd)).toBeUndefined();
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

    const result = await runTask(await buildUpdateTask(runtime));
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

describe("sources update — refuses an empty store (A4)", () => {
  /** A local package that ships NO `.ttl` (an empty definitions directory). */
  function emptyPackage(): string {
    const pkg = tmp("pragma-empty-pkg-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    return pkg;
  }

  it("a package with no .ttl is refused, and no pointer is written", async () => {
    // On base this builds a 0-triple pack whose empty data.nq fails the
    // completeness gate — so the "successful" update boots to a PERMANENT
    // STORE_UNAVAILABLE loop. The fix refuses before writing the pointer.
    const pkg = emptyPackage();
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    await expect(buildUpdateTask(runtime)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    // No pointer → the embedded fallback / prior state survives, no boot loop.
    expect(readActivePack(cwd)).toBeUndefined();
  });

  it("no configured packs is refused rather than pointing at an empty pack", async () => {
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, []);
    await expect(buildUpdateTask(runtime)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readActivePack(cwd)).toBeUndefined();
  });

  it("a comment-only .ttl (0 triples) is refused too", async () => {
    const pkg = tmp("pragma-noTriples-pkg-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    // Parses fine, but yields no triples — the post-build 0-triple guard.
    writeFileSync(
      join(pkg, "definitions", "empty.ttl"),
      "# only a comment, no triples\n",
    );
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await expect(buildUpdateTask(runtime)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readActivePack(cwd)).toBeUndefined();
  });
});

describe("sources update — conflicting @prefix detection (A5)", () => {
  it("flags a label bound to two different IRIs across packages", () => {
    const clashes = detectPrefixClashes([
      { content: "@prefix ex: <https://a.test/#> .\nex:One a ex:T ." },
      { content: "@prefix ex: <https://b.test/#> .\nex:Two a ex:T ." },
    ]);
    expect(clashes).toHaveLength(1);
    expect(clashes.at(0)?.label).toBe("ex");
    expect(clashes.at(0)?.iris).toEqual([
      "https://a.test/#",
      "https://b.test/#",
    ]);
  });

  it("does NOT flag harmless same-label/same-IRI redeclarations", () => {
    const clashes = detectPrefixClashes([
      { content: "@prefix ex: <https://a.test/#> .\nex:One a ex:T ." },
      { content: "@prefix ex: <https://a.test/#> .\nex:Two a ex:T ." },
    ]);
    expect(clashes).toEqual([]);
  });

  it("warns loudly on a cross-package prefix clash during update", async () => {
    const owl = "@prefix owl: <http://www.w3.org/2002/07/owl#> .\n";
    const pkgA = tmp("pragma-clash-a-");
    mkdirSync(join(pkgA, "definitions"), { recursive: true });
    writeFileSync(
      join(pkgA, "definitions", "a.ttl"),
      `@prefix ex: <https://a.test/#> .\n${owl}ex:Thing a owl:Class .\nex:one a ex:Thing .\n`,
    );
    const pkgB = tmp("pragma-clash-b-");
    mkdirSync(join(pkgB, "definitions"), { recursive: true });
    writeFileSync(
      join(pkgB, "definitions", "b.ttl"),
      `@prefix ex: <https://b.test/#> .\n${owl}ex:Widget a owl:Class .\nex:two a ex:Widget .\n`,
    );
    const cwd = tmp("pragma-proj-");
    const reports: string[] = [];
    const runtime: PragmaRuntime = {
      ...runtimeFor(cwd, [
        { name: "pkg-a", source: `file://${pkgA}` },
        { name: "pkg-b", source: `file://${pkgB}` },
      ]),
      report: (message: string) => reports.push(message),
    };

    await runTask(await buildUpdateTask(runtime));
    expect(
      reports.some(
        (r) => r.includes('Prefix "ex:"') && r.includes("conflicting"),
      ),
    ).toBe(true);
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
    expect(outcome.stdout).toContain("Resolve and build 1 pack(s)");
    expect(outcome.stdout).toContain(UNREACHABLE);
    // The project mutation is previewed, not performed: the plan names the
    // exact pointer file a real run would write, and no pointer landed.
    expect(outcome.stdout).toContain(activePackPath(cwd));
    expect(readActivePack(cwd)).toBeUndefined();
    // The store was never even asked for.
    expect(runtime.store.booted).toBe(false);
  });

  it("MCP sources_update without confirm returns a plan, fetching nothing", async () => {
    const cwd = tmp("pragma-proj-");
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      `export default { packs: [{ name: "pkg-remote", source: "${UNREACHABLE}" }] };\n`,
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
    // Plan-first withheld the write — no pointer landed.
    expect(readActivePack(cwd)).toBeUndefined();
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
      await buildUpdateTask(runtime);
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
    // … and is NOT the internal-bug "report this issue" path.
    expect(err.message).not.toContain("Internal error");
    expect(err.recovery?.message ?? "").not.toContain("report this issue");
    // The recovery points the user at a runnable, useful next step.
    expect(err.recovery?.cli).toBe("pragma sources update --verbose");
    // Nothing was pointed at on failure.
    expect(readActivePack(cwd)).toBeUndefined();
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
      await buildUpdateTask(runtime);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    const err = caught as PragmaError;
    expect(err.code).toBe("CONFIG_ERROR");
    expect(err.message).toContain("pkg-remote");
    expect(err.message).not.toContain("Internal error");
    expect(readActivePack(cwd)).toBeUndefined();
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

    await expect(buildUpdateTask(runtime)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    let caught: unknown;
    try {
      await buildUpdateTask(runtime);
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

    const result = await runTask(await buildUpdateTask(runtime));
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readActivePack(cwd)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("without --skip-invalid, one malformed source fails the whole update", async () => {
    const pkg = packageWithExtra("bad.ttl", BAD_TTL);
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await expect(buildUpdateTask(runtime, false)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readActivePack(cwd)).toBeUndefined();
  });

  it("with --skip-invalid, drops the bad source, warns loudly, and builds from the rest", async () => {
    const pkg = packageWithExtra("bad.ttl", BAD_TTL);
    const cwd = tmp("pragma-proj-");
    const reports: string[] = [];
    const runtime: PragmaRuntime = {
      ...runtimeFor(cwd, [{ name: "pkg-a", source: `file://${pkg}` }]),
      report: (message: string) => reports.push(message),
    };

    const result = await runTask(await buildUpdateTask(runtime, true));
    // Built from the good widget.ttl, not aborted.
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readActivePack(cwd)).toMatch(/^[0-9a-f]{64}$/);
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
    await expect(buildUpdateTask(runtime, true)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(readActivePack(cwd)).toBeUndefined();
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

  let savedHome: string | undefined;
  let home: string;

  beforeEach(() => {
    savedDataHome = process.env.XDG_DATA_HOME;
    dataHome = tmp("pragma-datahome-");
    process.env.XDG_DATA_HOME = dataHome;
    // HOME is isolated because an update now converges the GLOBAL band, and
    // the global band's link directories live under it. A test that read the
    // real home would be writing into the developer's own harness folders.
    savedHome = process.env.HOME;
    home = tmp("pragma-home-");
    process.env.HOME = home;
  });
  afterEach(() => {
    if (savedDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedDataHome;
    if (savedHome === undefined) delete process.env.HOME;
    else process.env.HOME = savedHome;
  });

  /** The cross-client harness skills dir, pre-created so it is convergeable. */
  const crossClientDir = (): string => {
    const dir = join(home, ".agents", "skills");
    mkdirSync(dir, { recursive: true });
    return dir;
  };

  it("symlinks a package skill into the installed root so `skill list` finds it", async () => {
    const pkg = skillPackage("foo");
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);

    await runTask(await buildUpdateTask(runtime));

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
    await runTask(await buildUpdateTask(runtime));

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
    await runUndo(await buildUpdateTask(runtime));

    expect(existsSync(join(dataHome, "pragma", "skills", "bar"))).toBe(false);
  });

  /** The installed-skills root, created so a prior install can be seeded into it. */
  function installedRoot(): string {
    const root = join(dataHome, "pragma", "skills");
    mkdirSync(root, { recursive: true });
    return root;
  }

  /** A symlink at `<installedRoot>/<name>` whose target does not exist. */
  function danglingLink(root: string, name: string): string {
    const target = join(tmp("pragma-uninstalled-"), "skills", name);
    symlinkSync(target, join(root, name));
    return target;
  }

  // The `@canonical/design-system` 0.2.0 regression: 0.1.2 shipped
  // `component-specifier`, 0.2.0 deleted it in favour of `specify-component`,
  // and every machine that had updated against 0.1.2 kept a symlink into a
  // package directory that no longer exists.
  it("prunes a link whose package dropped the skill", async () => {
    const pkg = skillPackage("specify-component"); // the 0.2.0 shape
    const root = installedRoot();
    danglingLink(root, "component-specifier"); // what 0.1.2 left behind

    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "design-system", source: `file://${pkg}` },
    ]);
    await runTask(await buildUpdateTask(runtime));

    expect(readdirSync(root)).toEqual(["specify-component"]);
    expect(discoverSkills(cwd).map((s) => s.name)).not.toContain(
      "component-specifier",
    );
  });

  it("spares a manually-installed skill and a foreign link that still resolves", async () => {
    const pkg = skillPackage("specify-component");
    const root = installedRoot();
    danglingLink(root, "component-specifier");

    // A hand-installed skill: a REAL directory, belonging to no package. The
    // install pass already refuses to clobber these; so must the prune pass.
    const manual = join(root, "hand-written");
    mkdirSync(manual, { recursive: true });
    writeFileSync(
      join(manual, "SKILL.md"),
      "---\nname: hand-written\ndescription: Mine.\n---\n",
    );
    // Someone's own link into a checkout this update knows nothing about, and
    // which still resolves. Deliberately RELATIVE: a relative target is stored
    // relative to the LINK's directory, so resolving it against anything else
    // (the cwd, say) would read as broken and eat a perfectly live link.
    const foreign = join(dataHome, "elsewhere", "my-own");
    mkdirSync(foreign, { recursive: true });
    writeFileSync(
      join(foreign, "SKILL.md"),
      "---\nname: my-own\ndescription: Theirs.\n---\n",
    );
    symlinkSync(join("..", "..", "elsewhere", "my-own"), join(root, "my-own"));

    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "design-system", source: `file://${pkg}` },
    ]);
    await runTask(await buildUpdateTask(runtime));

    // Only the dangling link went.
    expect(readdirSync(root).sort()).toEqual([
      "hand-written",
      "my-own",
      "specify-component",
    ]);
    expect(lstatSync(manual).isDirectory()).toBe(true);
    expect(existsSync(join(manual, "SKILL.md"))).toBe(true);
    expect(lstatSync(join(root, "my-own")).isSymbolicLink()).toBe(true);
    expect(existsSync(join(root, "my-own"))).toBe(true); // still resolves
    const found = discoverSkills(cwd).map((s) => s.name);
    expect(found).toEqual(
      expect.arrayContaining(["hand-written", "my-own", "specify-component"]),
    );
  });

  it("re-points, rather than prunes, a dangling link the package still provides", async () => {
    const pkg = skillPackage("foo");
    const root = installedRoot();
    danglingLink(root, "foo"); // e.g. the package moved to a new cache dir

    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await runTask(await buildUpdateTask(runtime));

    // `replaced`, never `pruned`: the prune pass skips every name this run
    // planned, or it would delete the link the install pass just created.
    expect(readlinkSync(join(root, "foo"))).toBe(join(pkg, "skills", "foo"));
    expect(discoverSkills(cwd).map((s) => s.name)).toContain("foo");
  });

  it("is reversible — undo restores a pruned link, dangling target and all", async () => {
    const pkg = skillPackage("specify-component");
    const root = installedRoot();
    const staleTarget = danglingLink(root, "component-specifier");
    const link = join(root, "component-specifier");

    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "design-system", source: `file://${pkg}` },
    ]);
    // The plan is made while the stale link is still there; `runUndo` MOCKS the
    // forward effects, so stand in for the delete it would have performed.
    const task = await buildUpdateTask(runtime);
    rmSync(link);

    const { runUndo } = await import("@canonical/task/node");
    await runUndo(task);

    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(staleTarget); // the target it always had
  });

  it("undoes a prune whose forward delete never ran, rather than failing EEXIST", async () => {
    const pkg = skillPackage("specify-component");
    const root = installedRoot();
    const staleTarget = danglingLink(root, "component-specifier");

    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "design-system", source: `file://${pkg}` },
    ]);
    // No `rmSync` this time: the link is still in place when the undo re-links,
    // and `fs.symlink` refuses an existing path — so the undo must clear it.
    const { runUndo } = await import("@canonical/task/node");
    await expect(runUndo(await buildUpdateTask(runtime))).resolves.toBeTruthy();

    expect(readlinkSync(join(root, "component-specifier"))).toBe(staleTarget);
  });

  it("plans no prunes when nothing was ever installed", async () => {
    const pkg = skillPackage("foo"); // $XDG_DATA_HOME/pragma/skills absent
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a", source: `file://${pkg}` },
    ]);
    await runTask(await buildUpdateTask(runtime));

    expect(readdirSync(join(dataHome, "pragma", "skills"))).toEqual(["foo"]);
  });

  it("sees a package that ships `skills/<name>` as a SYMLINK", async () => {
    // `lstat().isDirectory()` reports the LINK, not the directory behind it, so
    // a pnpm / monorepo / `file:` layout contributed nothing at all, silently.
    const real = tmp("pragma-realskill-");
    mkdirSync(join(real, "linked-skill"), { recursive: true });
    writeFileSync(
      join(real, "linked-skill", "SKILL.md"),
      "---\nname: linked-skill\ndescription: Behind a link.\n---\n",
    );
    const pkg = filePackage();
    mkdirSync(join(pkg, "skills"), { recursive: true });
    symlinkSync(join(real, "linked-skill"), join(pkg, "skills", "linked-skill"));

    const cwd = tmp("pragma-proj-");
    await runTask(
      await buildUpdateTask(
        runtimeFor(cwd, [{ name: "pkg-a", source: `file://${pkg}` }]),
      ),
    );
    expect(discoverSkills(cwd).map((s) => s.name)).toContain("linked-skill");
  });
});

describe("sources update — converges the global band (converge-only)", () => {
  let savedDataHome: string | undefined;
  let savedHome: string | undefined;
  let dataHome: string;
  let home: string;

  /** A local package that also ships `skills/<name>/SKILL.md`. */
  function skillPackage(...skillNames: string[]): string {
    const pkg = filePackage();
    for (const skillName of skillNames) {
      const skillDir = join(pkg, "skills", skillName);
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        `---\nname: ${skillName}\ndescription: From a package.\n---\nBody.`,
      );
    }
    return pkg;
  }

  beforeEach(() => {
    savedDataHome = process.env.XDG_DATA_HOME;
    savedHome = process.env.HOME;
    dataHome = tmp("pragma-datahome-");
    home = tmp("pragma-home-");
    process.env.XDG_DATA_HOME = dataHome;
    process.env.HOME = home;
  });
  afterEach(() => {
    if (savedDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedDataHome;
    if (savedHome === undefined) delete process.env.HOME;
    else process.env.HOME = savedHome;
  });

  /** The installed root (layer 1). */
  const installedRoot = (): string => join(dataHome, "pragma", "skills");
  /** The cross-client harness dir (layer 2), created so it is convergeable. */
  const harnessDir = (): string => {
    const dir = join(home, ".agents", "skills");
    mkdirSync(dir, { recursive: true });
    return dir;
  };
  /** Retire a skill from the package IN PLACE — how a pack upgrade drops one. */
  const dropSkill = (pkg: string, name: string): void => {
    rmSync(join(pkg, "skills", name), { recursive: true, force: true });
  };
  const update = async (pkg: string, cwd: string): Promise<void> => {
    await runTask(
      await buildUpdateTask(
        runtimeFor(cwd, [{ name: "design-system", source: `file://${pkg}` }]),
      ),
    );
  };

  it("a NEW pack skill reaches the harness folder in one step", async () => {
    // The two-step: `sources update` wrote layer 1 and stopped, so a new pack
    // skill appeared in no harness directory until the user separately ran
    // `setup skills`.
    const dir = harnessDir();
    await update(skillPackage("added"), tmp("pragma-proj-"));
    expect(readlinkSync(join(dir, "added"))).toBe(
      join(installedRoot(), "added"),
    );
  });

  it("a DROPPED pack skill has its harness link removed (the reported case)", async () => {
    const dir = harnessDir();
    const cwd = tmp("pragma-proj-");
    const pkg = skillPackage("kept", "dropped");
    // 0.1.2 shipped both...
    await update(pkg, cwd);
    expect(existsSync(join(dir, "dropped"))).toBe(true);
    // ...0.2.0 drops one, in place, so the layer-1 link now dangles and its
    // prune fires. Layer 2 must follow it.
    dropSkill(pkg, "dropped");
    await update(pkg, cwd);
    // `existsSync` FOLLOWS a link, so a dangling one false-negatives — lstat.
    expect(() => lstatSync(join(dir, "dropped"))).toThrow();
    expect(readlinkSync(join(dir, "kept"))).toBe(join(installedRoot(), "kept"));
  });

  it("CONVERGE-ONLY: a machine that never ran `setup skills` gets no new dirs", async () => {
    // The operator ruling, and the reason this is safe to expose over MCP:
    // `sources update` is `mutates: true` AND `expose: true`, so an agent must
    // not be able to make it conjure `~/.claude/skills` into existence.
    await update(skillPackage("added"), tmp("pragma-proj-"));
    expect(existsSync(join(home, ".agents"))).toBe(false);
    expect(existsSync(join(home, ".claude"))).toBe(false);
    // Layer 1 is still installed — only the band convergence stood down.
    expect(existsSync(join(installedRoot(), "added"))).toBe(true);
  });

  it("SAFETY: a real dir, a resolving user link and a `-backup` sibling all survive", async () => {
    const dir = harnessDir();
    const cwd = tmp("pragma-proj-");
    const pkg = skillPackage("kept", "dropped");
    await update(pkg, cwd);

    // A hand-placed skill directory, at a name the pack also provides.
    const real = join(dir, "hand-placed");
    mkdirSync(real, { recursive: true });
    writeFileSync(join(real, "SKILL.md"), "hand-placed\n");
    // Someone's own link into their own checkout.
    const mine = join(tmp("pragma-mine-"), "mine");
    mkdirSync(mine, { recursive: true });
    symlinkSync(mine, join(dir, "mine"));
    // A link into a SIBLING whose name merely EXTENDS the root's — the old
    // string-prefix bug classified this as ours and deleted it.
    const backup = join(`${installedRoot()}-backup`, "dropped");
    mkdirSync(backup, { recursive: true });
    rmSync(join(dir, "dropped"));
    symlinkSync(backup, join(dir, "dropped"));

    dropSkill(pkg, "dropped"); // retired upstream
    await update(pkg, cwd);

    expect(readFileSync(join(real, "SKILL.md"), "utf-8")).toBe("hand-placed\n");
    expect(readlinkSync(join(dir, "mine"))).toBe(mine);
    // Not ours despite sharing a string prefix with the installed root.
    expect(readlinkSync(join(dir, "dropped"))).toBe(backup);
  });

  it("is idempotent — a second update re-links nothing", async () => {
    const dir = harnessDir();
    const cwd = tmp("pragma-proj-");
    const pkg = skillPackage("stable");
    await update(pkg, cwd);
    const before = lstatSync(join(dir, "stable")).mtimeMs;
    await update(pkg, cwd);
    expect(lstatSync(join(dir, "stable")).mtimeMs).toBe(before);
  });

  it("is reversible — undo removes the harness link it created", async () => {
    const dir = harnessDir();
    const { runUndo } = await import("@canonical/task/node");
    await runUndo(
      await buildUpdateTask(
        runtimeFor(tmp("pragma-proj-"), [
          {
            name: "design-system",
            source: `file://${skillPackage("added")}`,
          },
        ]),
      ),
    );
    expect(existsSync(join(dir, "added"))).toBe(false);
  });
});

describe("sources status — entityCount from the manifest (A10)", () => {
  it("reports the count from the manifest even when index.json is unreadable", async () => {
    // A pack of its OWN (unique TTL ⇒ unique content hash), so corrupting its
    // cached index cannot reach any other test's pack in the shared cache.
    const pkg = tmp("pragma-a10-pkg-");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    writeFileSync(
      join(pkg, "definitions", "widget.ttl"),
      `${TTL}ex:a10only a ex:Widget ; rdfs:label "A10" .\n`,
    );
    const cwd = tmp("pragma-proj-");
    const runtime = runtimeFor(cwd, [
      { name: "pkg-a10", source: `file://${pkg}` },
    ]);
    const result = await runTask(await buildUpdateTask(runtime));

    // Corrupt index.json but keep it non-empty, so the pack still reads as
    // complete: any path that PARSED it to count would now yield null.
    writeFileSync(join(packDir(result.contentHash), "index.json"), "not json");

    const status = await collectStatus(bootRuntime(flagsJson, cwd));
    // Two abox individuals (ex:one, ex:a10only); ex:Widget is tbox, not counted.
    expect(status.entityCount).toBe(2);
  });
});

describe("sources status CLI-json == MCP tool (PROTECTED)", () => {
  it("a fresh install's status is byte-equal on both surfaces", async () => {
    // Both surfaces boot from the SAME cwd + isolated config (default packs,
    // nothing built), so the storeless status must be identical.
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
    // Nothing built here, and the packs are the distribution's own — so the
    // embedded snapshot is what answers reads, and status says exactly that.
    expect((cliEnvelope.data as { store: string }).store).toBe("embedded");
  });
});
