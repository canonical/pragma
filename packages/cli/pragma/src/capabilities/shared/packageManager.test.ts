/**
 * The install-source detector, driven entirely by fixtures.
 *
 * `detectInstallSource` itself captures the live process; the decision lives
 * in the pure `classifyInstall`, which takes an {@link InstallProbe} — paths,
 * environment, and injected filesystem readers — so every layout that has
 * ever been wrong is a deterministic case here, independent of the machine
 * the suite runs on (the `PlatformEnv` fixture pattern from
 * `@canonical/harnesses`).
 *
 * The headline case is the LINKED development install (`npm link`/`bun link`):
 * the old env-var heuristic reported it as `node (global)` and would have
 * offered `npm i -g`, which overwrites the link to the worktree being
 * developed. Here it must be identified as linked — and the type of
 * `pmUpdateCommand` (global arm only) makes producing a command for it a
 * compile error, which is the strongest "no upgrade command" assertion there
 * is.
 */

import { describe, expect, it } from "vitest";
import {
  classifyInstall,
  containsPath,
  ephemeralRunner,
  findInstallRoot,
  type InstallProbe,
  managerFromPath,
  pmUpdateCommand,
} from "./packageManager.js";
import { PRAGMA_PACKAGE } from "./registry.js";

/** The module-relative suffix the running entry carries under `dist`. */
const ENTRY = "dist/src/capabilities/shared/packageManager.js";

/** Build a probe whose filesystem is the given symlink map + file list. */
function probeOf(
  over: Partial<InstallProbe>,
  fs: { links?: Record<string, string>; files?: string[] } = {},
): InstallProbe {
  const links = fs.links ?? {};
  const resolveLink = (path: string): string | undefined => {
    const target = links[path];
    if (target === undefined) return undefined;
    const base = path.slice(0, path.lastIndexOf("/"));
    return target.startsWith("/") ? target : `${base}/${target}`;
  };
  return {
    entry: "/unset",
    invoked: undefined,
    cwd: "/somewhere/else",
    userAgent: undefined,
    runtime: "node",
    readLink: (path) => links[path],
    realPath: (path) => {
      // Follow the final component's link chain, normalizing `..` segments —
      // enough realpath for these fixtures.
      let current = path;
      for (let hop = 0; hop < 10; hop++) {
        const next = resolveLink(current);
        if (next === undefined) break;
        current = next;
      }
      const segments: string[] = [];
      for (const part of current.split("/")) {
        if (part === "..") segments.pop();
        else if (part !== "." && part !== "") segments.push(part);
      }
      return `/${segments.join("/")}`;
    },
    exists: (path) => fs.files?.includes(path) ?? false,
    ...over,
  };
}

const G = "/home/u/.npm-global";
const NPM_PKG = `${G}/lib/node_modules/@canonical/pragma-cli`;

describe("classifyInstall — global installs", () => {
  it("npm global: bin symlink into an unmarked global tree", () => {
    const install = classifyInstall(
      probeOf(
        { entry: `${NPM_PKG}/${ENTRY}`, invoked: `${G}/bin/pragma` },
        {
          links: {
            [`${G}/bin/pragma`]:
              "../lib/node_modules/@canonical/pragma-cli/dist/src/bin.js",
          },
        },
      ),
    );
    expect(install).toMatchObject({ kind: "global", pm: "npm" });
    expect(install.label).toBe("npm (global)");
    if (install.kind === "global") {
      expect(pmUpdateCommand(install, PRAGMA_PACKAGE)).toBe(
        `npm i -g ${PRAGMA_PACKAGE}`,
      );
    }
  });

  it("the user-agent NEVER overrides the path shape (corroboration only)", () => {
    // `bun run some-script` invoking a globally npm-installed pragma sets a
    // bun user-agent — the install is still npm's.
    const install = classifyInstall(
      probeOf({
        entry: `${NPM_PKG}/${ENTRY}`,
        userAgent: "bun/1.2.19 npm/? node/v24.3.0 linux x64",
      }),
    );
    expect(install).toMatchObject({ kind: "global", pm: "npm" });
  });

  it("bun global: ~/.bun/install/global shape", () => {
    const pkg =
      "/home/u/.bun/install/global/node_modules/@canonical/pragma-cli";
    const install = classifyInstall(
      probeOf(
        { entry: `${pkg}/${ENTRY}`, invoked: "/home/u/.bun/bin/pragma" },
        {
          links: {
            "/home/u/.bun/bin/pragma":
              "../install/global/node_modules/@canonical/pragma-cli/dist/src/bin.js",
          },
        },
      ),
    );
    expect(install).toMatchObject({ kind: "global", pm: "bun" });
    if (install.kind === "global") {
      expect(pmUpdateCommand(install, PRAGMA_PACKAGE)).toBe(
        `bun add -g ${PRAGMA_PACKAGE}`,
      );
    }
  });

  it("pnpm global: the .pnpm store segment names the manager", () => {
    const store =
      "/home/u/.local/share/pnpm/global/5/.pnpm/@canonical+pragma-cli@0.35.0/node_modules/@canonical/pragma-cli";
    const install = classifyInstall(probeOf({ entry: `${store}/${ENTRY}` }));
    expect(install).toMatchObject({ kind: "global", pm: "pnpm" });
  });

  it("volta: ~/.volta/tools/image/packages shape, with volta's own command", () => {
    const pkg =
      "/home/u/.volta/tools/image/packages/pragma-cli/lib/node_modules/@canonical/pragma-cli";
    // Volta's bin shim is a real executable, not a symlink — the chain walk
    // yields nothing and the entry path decides.
    const install = classifyInstall(
      probeOf({
        entry: `${pkg}/${ENTRY}`,
        invoked: "/home/u/.volta/bin/pragma",
      }),
    );
    expect(install).toMatchObject({ kind: "global", pm: "volta" });
    if (install.kind === "global") {
      expect(pmUpdateCommand(install, PRAGMA_PACKAGE)).toBe(
        `volta install ${PRAGMA_PACKAGE}`,
      );
    }
  });

  it("asdf hosts an ordinary npm global tree", () => {
    const pkg =
      "/home/u/.asdf/installs/nodejs/22.5.0/lib/node_modules/@canonical/pragma-cli";
    const install = classifyInstall(probeOf({ entry: `${pkg}/${ENTRY}` }));
    expect(install).toMatchObject({ kind: "global", pm: "npm" });
  });
});

describe("classifyInstall — the LINKED development install (the headline)", () => {
  // The layout measured on a real machine: `which pragma` →
  // ~/.npm-global/bin/pragma → node_modules/@canonical/pragma-cli, which is
  // itself a symlink OUT of the global root into a development worktree. The
  // module loader realpath-resolves `import.meta.url`, so the entry has
  // already escaped to the worktree — only the argv[1] chain can see the link.
  const worktree =
    "/home/u/code/cn/pragma/.claude/worktrees/try-main/packages/cli/pragma";

  const linkedProbe = (over: Partial<InstallProbe> = {}): InstallProbe =>
    probeOf(
      {
        entry: `${worktree}/${ENTRY}`,
        invoked: `${G}/bin/pragma`,
        ...over,
      },
      {
        links: {
          [`${G}/bin/pragma`]:
            "../lib/node_modules/@canonical/pragma-cli/dist/src/bin.js",
          [NPM_PKG]:
            "../../../../code/cn/pragma/.claude/worktrees/try-main/packages/cli/pragma",
        },
      },
    );

  it("identifies npm link — never 'global'", () => {
    const install = classifyInstall(linkedProbe());
    expect(install.kind).toBe("linked");
    expect(install.label).toBe("linked (development checkout)");
    if (install.kind === "linked") {
      expect(install.target).toBe(worktree);
    }
    // No upgrade command exists for it: `pmUpdateCommand` only accepts the
    // global arm, so the following would not compile —
    //   pmUpdateCommand(install, PRAGMA_PACKAGE)
    // — and the runtime data carries guidance instead (see upgrade.test.ts).
  });

  it("identifies bun link, naming the hosting manager", () => {
    const pkg =
      "/home/u/.bun/install/global/node_modules/@canonical/pragma-cli";
    const checkout =
      "/home/u/code/cn/pragma/.claude/worktrees/fix-tier-rank/packages/cli/pragma";
    const install = classifyInstall(
      probeOf(
        {
          entry: `${checkout}/${ENTRY}`,
          invoked: "/home/u/.bun/bin/pragma",
          runtime: "bun",
        },
        {
          links: {
            "/home/u/.bun/bin/pragma":
              "../install/global/node_modules/@canonical/pragma-cli/dist/src/bin.js",
            [pkg]: checkout,
          },
        },
      ),
    );
    expect(install).toMatchObject({ kind: "linked", pm: "bun" });
    expect(install.label).toBe("bun link (development checkout)");
  });

  it("a workspace-internal package symlink is NOT a link — it stays inside the root", () => {
    // A monorepo's own `node_modules/<pkg>` → `packages/<pkg>` symlink points
    // outside node_modules but INSIDE the project — a workspace install.
    const root = "/home/u/proj";
    const install = classifyInstall(
      probeOf(
        {
          entry: `${root}/packages/cli/pragma/${ENTRY}`,
          invoked: `${root}/node_modules/.bin/pragma`,
          cwd: `${root}/apps/site`,
        },
        {
          links: {
            [`${root}/node_modules/.bin/pragma`]:
              "../@canonical/pragma-cli/dist/src/bin.js",
            [`${root}/node_modules/@canonical/pragma-cli`]:
              "../../packages/cli/pragma",
          },
          files: [`${root}/bun.lock`],
        },
      ),
    );
    expect(install).toMatchObject({ kind: "workspace", pm: "bun", root });
    expect(install.label).toBe("bun (local project)");
  });
});

describe("classifyInstall — ephemeral runners (no upgrade command)", () => {
  it("npx resolves into the ~/.npm/_npx cache", () => {
    const pkg =
      "/home/u/.npm/_npx/beb367dfa21eb3f5/node_modules/@canonical/pragma-cli";
    const install = classifyInstall(probeOf({ entry: `${pkg}/${ENTRY}` }));
    expect(install).toMatchObject({ kind: "ephemeral", runner: "npx" });
    expect(install.label).toBe("npx (ephemeral)");
  });

  it("bunx resolves into a bunx-* temp dir", () => {
    const pkg =
      "/tmp/bunx-1000-@canonical/pragma-cli@latest/node_modules/@canonical/pragma-cli";
    const install = classifyInstall(
      probeOf({ entry: `${pkg}/${ENTRY}`, runtime: "bun" }),
    );
    expect(install).toMatchObject({ kind: "ephemeral", runner: "bunx" });
  });
});

describe("classifyInstall — workspace installs", () => {
  const root = "/home/u/proj";
  const pkg = `${root}/node_modules/@canonical/pragma-cli`;

  it("names the manager from the lockfile beside the install root", () => {
    const install = classifyInstall(
      probeOf(
        { entry: `${pkg}/${ENTRY}`, cwd: `${root}/packages/site` },
        { files: [`${root}/package-lock.json`] },
      ),
    );
    expect(install).toMatchObject({ kind: "workspace", pm: "npm", root });
    expect(install.label).toBe("npm (local project)");
  });

  it("falls back to the user-agent when no lockfile marks the tree", () => {
    const install = classifyInstall(
      probeOf({
        entry: `${pkg}/${ENTRY}`,
        cwd: root,
        userAgent: "pnpm/9.1.0 npm/? node/v20.11.0 linux x64",
      }),
    );
    expect(install).toMatchObject({ kind: "workspace", pm: "pnpm" });
  });

  it("stays honest with no marker at all", () => {
    const install = classifyInstall(
      probeOf({ entry: `${pkg}/${ENTRY}`, cwd: root }),
    );
    expect(install.kind).toBe("workspace");
    expect(install.label).toBe("local project dependency");
  });
});

describe("classifyInstall — unknown (the honest fallback)", () => {
  it("a source checkout run directly is unknown, not global", () => {
    const entry =
      "/work/pragma/packages/cli/pragma/src/capabilities/shared/packageManager.ts";
    const install = classifyInstall(
      probeOf({
        entry,
        invoked: "/work/pragma/packages/cli/pragma/src/bin.ts",
      }),
    );
    expect(install.kind).toBe("unknown");
    expect(install.label).toBe("unknown (node runtime)");
  });

  it("a FOREIGN bin on argv[1] (a test runner) never misattributes the install", () => {
    const repo = "/repo";
    const install = classifyInstall(
      probeOf(
        {
          entry: `${repo}/packages/cli/pragma/src/capabilities/shared/packageManager.ts`,
          invoked: `${repo}/node_modules/.bin/vitest`,
        },
        {
          links: {
            [`${repo}/node_modules/.bin/vitest`]: "../vitest/vitest.mjs",
          },
        },
      ),
    );
    expect(install.kind).toBe("unknown");
  });

  it("a symlink cycle on the invoked path is bounded, not spun", () => {
    const install = classifyInstall(
      probeOf(
        { entry: "/src/tree/file.ts", invoked: "/a" },
        { links: { "/a": "/b", "/b": "/a" } },
      ),
    );
    expect(install.kind).toBe("unknown");
  });
});

describe("path-shape helpers (win32 shapes exercised, not host-validated)", () => {
  it("managerFromPath reads win32 volta and posix shapes alike", () => {
    expect(
      managerFromPath(
        "C:\\Users\\u\\AppData\\Local\\Volta\\tools\\image\\packages\\pragma-cli\\node_modules\\@canonical\\pragma-cli\\dist\\src\\bin.js",
      ),
    ).toBe("volta");
    expect(
      managerFromPath(
        "C:\\Users\\u\\AppData\\Roaming\\npm\\node_modules\\@canonical\\pragma-cli\\dist\\src\\bin.js",
      ),
    ).toBeUndefined();
    expect(
      managerFromPath("/home/u/.config/yarn/global/node_modules/x/bin.js"),
    ).toBe("yarn");
    expect(
      managerFromPath("/home/u/.nvm/versions/node/v20/lib/node_modules/x"),
    ).toBe("npm");
    // A project merely NAMED volta must not read as the volta layout.
    expect(
      managerFromPath("/home/u/volta/node_modules/x/bin.js"),
    ).toBeUndefined();
  });

  it("ephemeralRunner ignores ordinary directories that merely share a name (REGRESSION)", () => {
    // The patterns are anchored to each runner's real cache layout. Matching a
    // bare segment anywhere would reclassify a project living under a directory
    // called `dlx`, `_npx` or `bunx-something` as ephemeral — and since that
    // verdict is reached before the workspace check, it wins even with a
    // lockfile beside the root, leaving the user with no upgrade command and no
    // error explaining why.
    expect(
      ephemeralRunner("/work/dlx/app/node_modules/@canonical/pragma-cli"),
    ).toBeUndefined();
    expect(
      ephemeralRunner("/srv/_npx/site/node_modules/@canonical/pragma-cli"),
    ).toBeUndefined();
    expect(
      ephemeralRunner("/home/u/bunx-tools/node_modules/@canonical/pragma-cli"),
    ).toBeUndefined();
    // `dlx` outside a pnpm cache, and `_npx` outside npm's, stay ordinary.
    expect(
      ephemeralRunner("/home/u/.cache/yarn/dlx/abc/node_modules/x/bin.js"),
    ).toBeUndefined();
  });

  it("ephemeralRunner reads npx/bunx/dlx cache shapes on both separator styles", () => {
    expect(
      ephemeralRunner(
        "C:\\Users\\u\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\x\\bin.js",
      ),
    ).toBe("npx");
    expect(
      ephemeralRunner("/tmp/bunx-1000-x@latest/node_modules/x/bin.js"),
    ).toBe("bunx");
    expect(
      ephemeralRunner("/home/u/.cache/pnpm/dlx/abc/node_modules/x/bin.js"),
    ).toBe("pnpm dlx");
    expect(
      ephemeralRunner("/home/u/proj/node_modules/x/bin.js"),
    ).toBeUndefined();
  });
});

describe("findInstallRoot", () => {
  it("yields the directory the package was installed into", () => {
    expect(
      findInstallRoot(
        "/proj/node_modules/@canonical/pragma-cli/dist/src/bin.js",
      ),
    ).toBe("/proj");
  });

  it("takes the INNERMOST node_modules when they nest", () => {
    expect(
      findInstallRoot("/proj/node_modules/a/node_modules/b/dist/bin.js"),
    ).toBe("/proj/node_modules/a");
  });

  it("reads a win32 path with its own separator", () => {
    expect(
      findInstallRoot(
        "C:\\Users\\u\\AppData\\Roaming\\npm\\node_modules\\@canonical\\pragma-cli\\dist\\src\\bin.js",
      ),
    ).toBe("C:\\Users\\u\\AppData\\Roaming\\npm");
  });

  it("reports no install root for a source checkout", () => {
    expect(findInstallRoot("/work/pragma/packages/cli/pragma/src/bin.ts")).toBe(
      undefined,
    );
  });
});

describe("containsPath", () => {
  it("counts a directory as containing itself", () => {
    expect(containsPath("/proj", "/proj")).toBe(true);
  });

  // The case a literal cwd-prefix test got wrong: an ordinary local install run
  // from a subdirectory — which in a monorepo is the usual way to run it — was
  // reported as a GLOBAL install.
  it("counts a subdirectory as contained", () => {
    expect(containsPath("/proj", "/proj/packages/foo")).toBe(true);
  });

  it("does not count a sibling that merely shares a prefix", () => {
    expect(containsPath("/proj", "/proj-two")).toBe(false);
  });

  it("does not count an ancestor or an unrelated tree", () => {
    expect(containsPath("/proj/packages/foo", "/proj")).toBe(false);
    expect(containsPath("/usr/lib", "/home/u/proj")).toBe(false);
  });
});
