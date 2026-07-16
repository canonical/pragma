/**
 * Characterization (golden) snapshots of the two current executors —
 * `executeGenerator` (cli-core, drives `pragma create`) and `runSetupTask`
 * (drives `pragma setup`) — across the real generators and setup tasks.
 *
 * These lock the *observable output* of each executor for representative,
 * fully-answered inputs in every non-interactive mode. Both executors now run
 * real execution through the shared UI-free core (`runGeneratorTask`), and the
 * merged path must keep reproducing these byte-for-byte; the execution
 * characterization test alongside asserts the real-run path. Interactive
 * behavior is characterized separately, since it runs through the injected
 * `promptHandler` seam.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandContext, CommandResult } from "@canonical/cli-core";
import { executeGenerator } from "@canonical/cli-core";
import { generators as componentGenerators } from "@canonical/summon-component";
import { generators as packageGenerators } from "@canonical/summon-package";
import { describe, expect, it } from "vitest";
import runSetupTask from "../../domains/setup/helpers/runSetupTask.js";
import setupCompletions from "../../domains/setup/operations/setupCompletions.js";
import setupLsp from "../../domains/setup/operations/setupLsp.js";

const ROOT = "/tmp/characterization-project";

const ctx = (format: "text" | "json", llm = false): CommandContext => ({
  cwd: ROOT,
  globalFlags: { llm, format, verbose: false },
});

/**
 * Render an executor result to the plain string a user would see, with
 * environment-specific bytes normalised so a committed baseline compares
 * equal on every machine and in CI: ANSI color codes are stripped (chalk
 * enables them under nx's FORCE_COLOR in CI but not in a plain local run),
 * then the repo checkout root (package-generator plans embed absolute
 * template source paths) and the home directory (shell-completion install
 * targets embed `$HOME`) become stable tokens. The repo root is replaced
 * first — on a dev machine it usually lives under `$HOME`.
 */
const plain = (result: CommandResult): string => {
  let text =
    result.tag === "output"
      ? result.render.plain(result.value)
      : `[${result.tag}]`;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching the ANSI escape byte is the point
  text = text.replace(/\u001b\[[0-9;]*m/g, "");
  const repoRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../..",
  );
  text = text.split(repoRoot).join("<repo>");
  const home = process.env.HOME ?? "";
  return home === "" ? text : text.split(home).join("<home>");
};

// =============================================================================
// create — executeGenerator across the real component + package generators
// =============================================================================

const componentParams = { componentPath: "src/components/Button" };
const packageParams = { name: "@canonical/example", type: "library" };

describe("golden: executeGenerator — components", () => {
  for (const framework of ["react", "svelte", "lit"] as const) {
    const gen = componentGenerators[`component/${framework}`];

    it(`${framework} — dry-run plan`, async () => {
      const result = await executeGenerator(
        gen,
        { ...componentParams, dryRun: true },
        ctx("text"),
      );
      expect(plain(result)).toMatchSnapshot();
    });

    it(`${framework} — json plan`, async () => {
      const result = await executeGenerator(
        gen,
        { ...componentParams },
        ctx("json"),
      );
      expect(plain(result)).toMatchSnapshot();
    });

    it(`${framework} — llm plan`, async () => {
      const result = await executeGenerator(
        gen,
        { ...componentParams },
        ctx("text", true),
      );
      expect(plain(result)).toMatchSnapshot();
    });
  }
});

describe("golden: executeGenerator — package", () => {
  const gen = packageGenerators.package;

  it("library — dry-run plan", async () => {
    const result = await executeGenerator(
      gen,
      { ...packageParams, dryRun: true },
      ctx("text"),
    );
    expect(plain(result)).toMatchSnapshot();
  });

  it("library — json plan", async () => {
    const result = await executeGenerator(
      gen,
      { ...packageParams },
      ctx("json"),
    );
    expect(plain(result)).toMatchSnapshot();
  });
});

// =============================================================================
// setup — runSetupTask across representative deterministic setup tasks
// =============================================================================

describe("golden: runSetupTask — setups", () => {
  it("lsp — dry-run", async () => {
    const result = await runSetupTask(setupLsp(ROOT), { dryRun: true });
    expect(plain(result)).toMatchSnapshot();
  });

  it("completions (bash) — dry-run", async () => {
    const result = await runSetupTask(setupCompletions("bash"), {
      dryRun: true,
    });
    expect(plain(result)).toMatchSnapshot();
  });

  it("lsp — dry-run json", async () => {
    const result = await runSetupTask(setupLsp(ROOT), {
      dryRun: true,
      format: "json",
    });
    expect(plain(result)).toMatchSnapshot();
  });
});
