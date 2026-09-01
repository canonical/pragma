/**
 * The BUNDLED skills snapshot — the third discovery root, last in precedence.
 *
 * `scripts/bundle.ts` already resolved every declared pack to read its TTL into
 * `pack.generated.ts`; it now also copies each pack's `skills/<name>/` into the
 * committed `bundled-skills/` directory at the package root. So a fresh install
 * lists skills for the same reason it answers `block lookup`: the release
 * carries a snapshot of what its packs shipped.
 *
 * WHAT THESE CELLS SAMPLE. Every expectation about skill CONTENT is read out of
 * the committed artifact rather than written into a fixture beside the code.
 * Inventing "a bundled skill" here would prove that a directory this test wrote
 * can be discovered — which is already covered — while a snapshot that shipped
 * empty, shipped a folder with no `SKILL.md`, or was dropped from `files` would
 * stay green. The artifact is real upstream data; it is what has to work.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dryRun } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BIN_NAME } from "../../constants.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import { runCli } from "../../testing/helpers/runCli.js";
import { scopedChecks } from "../doctor/checks/targetHealth.js";
import {
  composeSkills,
  detectSkills,
  staleSkillLinks,
} from "../setup/operations/setupSkills.js";
import {
  bundledSkillsDir,
  discoverSkills,
  globalSkillRoots,
  installedSkillsDir,
  parseFrontmatter,
} from "./discover.js";

const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** The snapshot's folder → declared `name`, read from the shipped bytes. */
function shippedSkills(): { folder: string; name: string }[] {
  const root = bundledSkillsDir();
  if (root === undefined) return [];
  return readdirSync(root)
    .map((folder) => {
      const skillMd = join(root, folder, "SKILL.md");
      if (!existsSync(skillMd)) return undefined;
      const frontmatter = parseFrontmatter(readFileSync(skillMd, "utf-8"));
      return frontmatter ? { folder, name: frontmatter.name } : undefined;
    })
    .filter((entry): entry is { folder: string; name: string } => !!entry);
}

/** A FRESH INSTALL's environment: nothing of this machine is inherited. */
function freshInstallEnv(): Record<string, string> {
  const home = mkdtempSync(join(tmpdir(), "pragma-fresh-home-"));
  return {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "pragma-fresh-cfg-")),
    XDG_DATA_HOME: mkdtempSync(join(tmpdir(), "pragma-fresh-data-")),
    XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma-fresh-state-")),
    XDG_CACHE_HOME: mkdtempSync(join(tmpdir(), "pragma-fresh-cache-")),
  };
}

describe("bundled skills — the shipped snapshot", () => {
  it("the committed artifact is a real, well-formed skills root", () => {
    const root = bundledSkillsDir();
    expect(root).toBeDefined();
    const entries = readdirSync(root as string);
    // Not merely non-empty: EVERY entry must be a discoverable skill. A folder
    // the copy pass half-wrote (or a stray file) would be skipped silently by
    // discovery, which is exactly how a thinned snapshot ships unnoticed.
    expect(entries.length).toBeGreaterThan(0);
    expect(
      shippedSkills()
        .map((s) => s.folder)
        .sort(),
    ).toEqual([...entries].sort());
  });

  it("is the LAST discovery root, after project and installed", () => {
    const roots = globalSkillRoots();
    expect(roots[0]).toBe(installedSkillsDir());
    expect(roots.at(-1)).toBe(bundledSkillsDir());
  });
});

describe("bundled skills — a fresh install, through the shipped entry", () => {
  it("lists the packs' skills with no `sources update` (REGRESSION)", () => {
    // THE DEFECT. A fresh install had zero skills and a two-command, network-
    // dependent recovery (`sources update` then `setup skills`) for content the
    // release had already resolved at bundle time. Isolated HOME + all four XDG
    // roots, so anything answered here was answered from the package itself.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-fresh-proj-"));
    const outcome = runCli(["skill", "list", "--format", "json"], {
      cwd,
      env: freshInstallEnv(),
    });
    expect(outcome.exitCode).toBe(0);
    const envelope = JSON.parse(outcome.stdout) as {
      data: { name: string }[];
    };
    const listed = envelope.data.map((skill) => skill.name).sort();
    expect(listed.length).toBeGreaterThan(0);
    // Every skill the snapshot ships is listed — not just "some skills".
    expect(listed).toEqual(
      expect.arrayContaining(
        shippedSkills()
          .map((s) => s.name)
          .sort(),
      ),
    );
    expect(outcome.stderr).not.toContain("No skills found");
  });

  it("`setup --dry-run` OFFERS a skills row instead of skipping it", () => {
    // The other half of the same defect: the global scope's only source was the
    // installed root, so a fresh machine's setup plan skipped skills entirely
    // and pointed at `sources update` as the remedy.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-fresh-setup-"));
    const outcome = runCli(["setup", "--dry-run", "--global"], {
      cwd,
      env: freshInstallEnv(),
    });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toMatch(/skills\s+link\s+\d+ skills? →/);
    expect(outcome.stdout).not.toContain("no skills installed");
  });
});

describe("bundled skills — precedence", () => {
  let previousDataHome: string | undefined;
  let dataHome: string;
  let cwd: string;

  /** The first skill the snapshot ships — the name both overrides reuse. */
  const shadowed = (): { folder: string; name: string } => {
    const first = shippedSkills()[0];
    if (first === undefined) throw new Error("no bundled skills to shadow");
    return first;
  };

  /** Write a `SKILL.md` for `name` under `root/folder`, with a marker body. */
  const writeSkill = (root: string, folder: string, name: string): void => {
    mkdirSync(join(root, folder), { recursive: true });
    writeFileSync(
      join(root, folder, "SKILL.md"),
      `---\nname: ${name}\ndescription: OVERRIDE.\n---\n`,
    );
  };

  beforeEach(() => {
    previousDataHome = process.env.XDG_DATA_HOME;
    dataHome = mkdtempSync(join(tmpdir(), "pragma-prec-data-"));
    process.env.XDG_DATA_HOME = dataHome;
    cwd = mkdtempSync(join(tmpdir(), "pragma-prec-proj-"));
  });

  afterEach(() => {
    process.env.XDG_DATA_HOME = previousDataHome;
  });

  it("an INSTALLED skill of the same name wins over the bundled copy", () => {
    // The rule someone who ran `sources update` is relying on: the update they
    // asked for must reach them, never the copy frozen at release time.
    const { folder, name } = shadowed();
    writeSkill(installedSkillsDir(), folder, name);
    const found = discoverSkills(cwd).find((skill) => skill.name === name);
    expect(found?.description).toBe("OVERRIDE.");
    expect(found?.sourcePath).toBe(join(installedSkillsDir(), folder));
  });

  it("a PROJECT skill wins over both", () => {
    const { folder, name } = shadowed();
    writeSkill(installedSkillsDir(), folder, name);
    writeSkill(join(cwd, ".pragma", "skills"), folder, `${name}`);
    const found = discoverSkills(cwd).find((skill) => skill.name === name);
    expect(found?.sourcePath).toBe(join(cwd, ".pragma", "skills", folder));
  });

  it("shadowing REPLACES rather than duplicates the name", () => {
    const { folder, name } = shadowed();
    writeSkill(installedSkillsDir(), folder, name);
    const matches = discoverSkills(cwd).filter((skill) => skill.name === name);
    expect(matches).toHaveLength(1);
  });
});

describe("bundled skills — the upgrade hazard", () => {
  // THE HAZARD, spelled out. Every other link `setup skills` writes points into
  // a directory pragma controls; a bundled one points into the package
  // directory, which the PACKAGE MANAGER owns. `npm i -g` reuses the same path,
  // but a pnpm / npx / versioned layout does not — so an upgrade can leave a
  // harness link dangling at a package directory that no longer exists.
  //
  // The design turns on whether the EXISTING reconcile repairs that or leaves
  // it, and that is answered here by construction rather than by reading the
  // code: a link to a plausible previous release's path is planted in the
  // harness directory, and the forward plan is inspected.
  const FLAGS: GlobalFlags = {
    format: "plain",
    color: false,
    quiet: false,
    verbose: false,
  };

  let prevHome: string | undefined;
  let prevDataHome: string | undefined;
  let home: string;

  beforeEach(() => {
    prevHome = process.env.HOME;
    prevDataHome = process.env.XDG_DATA_HOME;
    home = mkdtempSync(join(tmpdir(), "pragma-upgrade-home-"));
    process.env.HOME = home;
    // An empty installed root, so the bundled snapshot is the scope's only
    // source — exactly a fresh install that has never run `sources update`.
    process.env.XDG_DATA_HOME = mkdtempSync(
      join(tmpdir(), "pragma-upgrade-data-"),
    );
  });

  afterEach(() => {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (prevDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = prevDataHome;
  });

  it("repairs a link into a REPLACED package directory (REGRESSION)", async () => {
    const first = shippedSkills()[0];
    if (first === undefined) throw new Error("no bundled skills");
    // The harness directory as an upgrade would leave it: a link at the right
    // name pointing into the version-stamped path of the release before this
    // one, which no longer exists.
    const harnessDir = join(home, ".agents", "skills");
    mkdirSync(harnessDir, { recursive: true });
    const linkPath = join(harnessDir, first.folder);
    symlinkSync(
      join(tmpdir(), "pragma-cli@0.34.0", "bundled-skills", first.folder),
      linkPath,
    );
    expect(lstatSync(linkPath).isSymbolicLink()).toBe(true); // present…
    expect(existsSync(linkPath)).toBe(false); // …and dangling.

    const cwd = mkdtempSync(join(tmpdir(), "pragma-upgrade-proj-"));
    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "global");

    // Planned as `replaced` — NOT skipped as somebody else's link, and NOT
    // swept as an orphan: the per-skill pass covers the path, so the sweep
    // never sees it. Both halves matter; either one alone would lose the link.
    const action = detected.actions.find((a) => a.linkPath === linkPath);
    expect(action?.action).toBe("replaced");
    expect(action?.skillName).toBe(first.name);
    expect(staleSkillLinks(detected).map((a) => a.linkPath)).not.toContain(
      linkPath,
    );

    // And the forward run is delete-then-relink onto the CURRENT package, so
    // one `setup skills` after an upgrade converges the harness.
    expect(
      dryRun(composeSkills(detected)).effects.map((e) => e._tag),
    ).toContain("DeleteFile");
    await runTask(composeSkills(detected));
    expect(existsSync(linkPath)).toBe(true);
    expect(readFileSync(join(linkPath, "SKILL.md"), "utf-8")).toContain(
      `name: ${first.name}`,
    );
  });

  it("doctor makes the upgrade window VISIBLE, with the command that closes it", async () => {
    // The residual risk is the gap between an upgrade and the next
    // `setup skills`: the link dangles and the harness sees a broken skill.
    // One command converges it (above) — so what has to be true is that
    // something TELLS the user to run it. This is that assertion. Without it
    // the window is real but silent, which is the "doctor blind to orphans"
    // shape sitting on a path an upgrade reaches routinely.
    const first = shippedSkills()[0];
    if (first === undefined) throw new Error("no bundled skills");
    const harnessDir = join(home, ".agents", "skills");
    mkdirSync(harnessDir, { recursive: true });
    symlinkSync(
      join(tmpdir(), "pragma-cli@0.34.0", "bundled-skills", first.folder),
      join(harnessDir, first.folder),
    );

    const cwd = mkdtempSync(join(tmpdir(), "pragma-upgrade-doctor-"));
    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), BIN_NAME);
    const row = rows.find((r) => r.name === "skills" && r.scope === "global");
    expect(row?.status).toBe("fail");
    expect(row?.detail).toContain("point elsewhere");
    // No AUTHORED remedy on this branch: the row takes the derived one, which
    // is exactly the command proven to repair it in the cell above.
    expect(row?.remedy).toBe(`${BIN_NAME} setup skills`);
  });

  it("discovery itself cannot degrade on an upgrade", () => {
    // The other half of the worry — that a moved package directory would make
    // the snapshot vanish from DISCOVERY too, silently returning the CLI to the
    // skips-everything state this change removes. It cannot: `bundledSkillsDir`
    // walks up from `import.meta.url`, so it resolves against whichever copy of
    // the package is EXECUTING, which is the new one by definition. There is no
    // recorded path anywhere that an upgrade could invalidate.
    expect((bundledSkillsDir() as string).startsWith(packageRoot)).toBe(true);
    const cwd = mkdtempSync(join(tmpdir(), "pragma-upgrade-disc-"));
    expect(discoverSkills(cwd).length).toBeGreaterThan(0);
  });
});

describe("bundled skills — packaging", () => {
  // Generous timeout: this shells out to the real packer over ~950 files.
  it("the snapshot is in the published tarball (`files` allowlist)", () => {
    // `files` allowlists are exactly the kind of thing that looks right and
    // ships nothing: the directory would exist in the repo, every test above
    // would pass from the source tree, and a consumer's install would carry no
    // skills at all. Only the packer's own answer settles it.
    const packed = spawnSync(
      "npm",
      ["pack", "--dry-run", "--json", "--ignore-scripts"],
      { cwd: packageRoot, encoding: "utf-8", timeout: 120_000 },
    );
    expect(packed.status).toBe(0);
    const files = (
      JSON.parse(packed.stdout) as { files: { path: string }[] }[]
    )[0]?.files.map((file) => file.path);
    for (const { folder } of shippedSkills()) {
      expect(files).toContain(`bundled-skills/${folder}/SKILL.md`);
    }
  }, 120_000);
});
