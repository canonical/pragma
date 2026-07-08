/**
 * Characterization (golden) snapshots of the two current executors —
 * `executeGenerator` (cli-core, drives `pragma create`) and `runSetupTask`
 * (drives `pragma setup`) — across the real generators and setup tasks.
 *
 * These lock the *observable output* of each executor for representative,
 * fully-answered inputs in every non-interactive mode. When the two executors
 * are merged into one journaled executor (4a), the merged path must reproduce
 * these byte-for-byte; the differential test added alongside the merge asserts
 * that. Interactive/interleaved-prompt behavior is characterized separately,
 * since it runs through the injected `promptHandler` seam.
 */

import type { CommandContext, CommandResult } from "@canonical/cli-core";
import { executeGenerator } from "@canonical/cli-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import { describe, expect, it } from "vitest";
import { COMPONENT_GENERATORS } from "../../domains/create/generators.js";
import runSetupTask from "../../domains/setup/helpers/runSetupTask.js";
import setupCompletions from "../../domains/setup/operations/setupCompletions.js";
import setupLsp from "../../domains/setup/operations/setupLsp.js";

const ROOT = "/tmp/characterization-project";

const ctx = (format: "text" | "json", llm = false): CommandContext => ({
  cwd: ROOT,
  globalFlags: { llm, format, verbose: false },
});

/** Render an executor result to the plain string a user would see. */
const plain = (result: CommandResult): string => {
  if (result.tag === "output") {
    return result.render.plain(result.value);
  }
  return `[${result.tag}]`;
};

// =============================================================================
// create — executeGenerator across the real component + package generators
// =============================================================================

const componentParams = { componentPath: "src/components/Button" };
const packageParams = { name: "@canonical/example", type: "library" };

describe("golden: executeGenerator — components", () => {
  for (const framework of ["react", "svelte", "lit"] as const) {
    const gen = COMPONENT_GENERATORS[framework];

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
