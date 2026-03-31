/**
 * Layer 4b: CLI user-story end-to-end tests.
 *
 * Runs the real `pragma` binary through subprocesses and validates
 * realistic user journeys against its JSON output.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type CommandResult, runCommand } from "../cli.js";

const tempDirs = new Set<string>();

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.clear();
});

function createWorkspace(config?: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma-cli-e2e-"));
  tempDirs.add(dir);

  if (config !== undefined) {
    writeFileSync(
      join(dir, "pragma.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      "utf-8",
    );
  }

  return dir;
}

function expectSuccess(result: CommandResult): void {
  expect(result.exitCode).toBe(0);
  expect(result.stderr.trim()).toBe("");
}

function parseJson<T>(result: CommandResult): T {
  expectSuccess(result);
  return JSON.parse(result.stdout) as T;
}

describe("CLI user stories", () => {
  it("story: a new contributor verifies the local installation with info", () => {
    const workspace = createWorkspace();

    const result = runCommand(["info", "--format", "json"], workspace);
    const data = parseJson<{
      version: string;
      pm: string;
      installSource: string;
      channel: string;
      store: { tripleCount: number };
    }>(result);

    expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(data.pm).toBe("bun");
    expect(data.installSource).toContain("local");
    expect(data.channel).toBe("normal");
    expect(data.store.tripleCount).toBeGreaterThan(0);
  }, 20_000);

  it("story: an explorer sees duplicate Button matches before scoping the workspace", () => {
    const workspace = createWorkspace();

    const result = runCommand(
      ["block", "lookup", "button", "--format", "json"],
      workspace,
    );
    const data = parseJson<{
      results: { name: string; tier: string }[];
      errors: unknown[];
    }>(result);

    expect(data.errors).toEqual([]);
    expect(data.results.length).toBeGreaterThan(1);
    expect(data.results.every((item) => item.name === "Button")).toBe(true);
    expect(data.results.some((item) => item.tier === "global")).toBe(true);
  }, 20_000);

  it("story: an app engineer scopes to global and resolves Button case-insensitively", () => {
    const workspace = createWorkspace({ tier: "global", channel: "normal" });

    const configResult = runCommand(
      ["config", "show", "--format", "json"],
      workspace,
    );
    const config = parseJson<{
      tier: string;
      channel: string;
      configFileExists: boolean;
      configFilePath: string;
    }>(configResult);

    expect(config.tier).toBe("global");
    expect(config.channel).toBe("normal");
    expect(config.configFileExists).toBe(true);
    expect(config.configFilePath).toContain("pragma.config.json");

    const lookupResult = runCommand(
      ["block", "lookup", "button", "--format", "json"],
      workspace,
    );
    const block = parseJson<{
      name: string;
      tier: string;
      uri: string;
    }>(lookupResult);

    expect(block.name).toBe("Button");
    expect(block.tier).toBe("global");
    expect(block.uri).toContain("global.component.button");
  }, 20_000);

  it("story: a standards auditor inspects a code rule in structured output", () => {
    const workspace = createWorkspace();

    const result = runCommand(
      ["standard", "lookup", "code/function/purity", "--format", "json"],
      workspace,
    );
    const standard = parseJson<{
      name: string;
      category: string;
      description: string;
    }>(result);

    expect(standard.name).toBe("code/function/purity");
    expect(standard.category).toBe("code");
    expect(standard.description.toLowerCase()).toContain("pure");
  }, 20_000);

  it("story: a component author previews a React scaffold before writing files", () => {
    const workspace = createWorkspace();

    const result = runCommand(
      [
        "create",
        "component",
        "react",
        "src/components/Button",
        "--dry-run",
        "--yes",
        "--format",
        "json",
      ],
      workspace,
    );
    const plan = parseJson<{
      generator: { name: string };
      answers: { componentPath: string };
      plan: { action: string; path: string }[];
      files: Record<string, string>;
    }>(result);

    expect(plan.generator.name).toBe("component/react");
    expect(plan.answers.componentPath).toBe("src/components/Button");
    expect(
      plan.plan.some(
        (step) =>
          step.action === "create" &&
          step.path === "src/components/Button/Button.tsx",
      ),
    ).toBe(true);
    expect(plan.files).toHaveProperty("src/components/Button/styles.css");
    expect(plan.files).toHaveProperty("src/components/index.ts");
  }, 20_000);

  it("story: a component author can create a React scaffold from positional args", () => {
    const workspace = createWorkspace();

    const result = runCommand(
      ["create", "component", "react", "MySth"],
      workspace,
    );

    expectSuccess(result);
    expect(result.stdout).toContain("Generation complete.");

    const componentFile = join(workspace, "MySth", "MySth.tsx");
    const indexFile = join(workspace, "MySth", "index.ts");

    expect(existsSync(componentFile)).toBe(true);
    expect(existsSync(indexFile)).toBe(true);
    expect(readFileSync(indexFile, "utf-8")).toContain("./MySth");
  }, 20_000);
});
