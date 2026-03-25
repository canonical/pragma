import type { DetectedHarness, HarnessDefinition } from "@canonical/harnesses";
import { dryRunWith, type Effect, filterEffects } from "@canonical/task";
import { describe, expect, it } from "vitest";
import type { DiscoveredSkill } from "../../skill/types.js";
import type { SetupSkillsResult } from "../types.js";
import setupSkills from "./setupSkills.js";

const MOCK_SKILLS: readonly DiscoveredSkill[] = [
  {
    name: "design-audit",
    description: "Audit a component against DS specs",
    sourcePath:
      "/project/node_modules/@canonical/ds-global/skills/design-audit",
    sourcePackage: "@canonical/ds-global",
    folderName: "design-audit",
    frontmatter: {
      name: "design-audit",
      description: "Audit a component against DS specs",
    },
  },
  {
    name: "scaffold-story",
    description: "Generate a Storybook story from anatomy",
    sourcePath:
      "/project/node_modules/@canonical/pragma-cli/skills/scaffold-story",
    sourcePackage: "@canonical/pragma-cli",
    folderName: "scaffold-story",
    frontmatter: {
      name: "scaffold-story",
      description: "Generate a Storybook story from anatomy",
    },
  },
];

function makeHarness(
  id: string,
  name: string,
  skillsDir: string,
): DetectedHarness {
  return {
    harness: {
      id,
      name,
      version: "*",
      detect: [],
      configPath: () => "",
      configFormat: "json",
      mcpKey: "mcpServers",
      skillsPath: (root: string) => `${root}/${skillsDir}`,
    } as HarnessDefinition,
    confidence: "high",
    configExists: false,
    configPath: "",
  };
}

const MOCK_HARNESSES: readonly DetectedHarness[] = [
  makeHarness("claude-code", "Claude Code", ".claude/skills"),
  makeHarness("cursor", "Cursor", ".cursor/skills"),
];

describe("setupSkills", () => {
  it("creates symlinks for each skill in each harness", () => {
    const task = setupSkills(MOCK_SKILLS, MOCK_HARNESSES, "/project");

    const mocks = new Map<string, (e: Effect) => unknown>([
      ["Exists", () => false],
    ]);

    const { value, effects } = dryRunWith(task, mocks);
    const result = value as SetupSkillsResult;

    const created = result.actions.filter((a) => a.action === "created");
    // 2 skills × 3 targets (claude, cursor, .agents/skills) = 6
    expect(created).toHaveLength(6);
    expect(result.harnessCount).toBe(2);
    expect(result.skillCount).toBe(2);

    const symlinkEffects = filterEffects(effects, "Symlink");
    expect(symlinkEffects).toHaveLength(6);
  });

  it("skips existing correct symlinks", () => {
    const task = setupSkills(MOCK_SKILLS, MOCK_HARNESSES, "/project");

    const mocks = new Map<string, (e: Effect) => unknown>([
      ["Exists", () => true],
      [
        "Exec",
        (e: Effect) => {
          if (e._tag === "Exec" && e.command === "readlink") {
            const linkPath = e.args[0];
            if (linkPath.includes("design-audit")) {
              return {
                stdout:
                  "/project/node_modules/@canonical/ds-global/skills/design-audit",
                stderr: "",
                exitCode: 0,
              };
            }
            if (linkPath.includes("scaffold-story")) {
              return {
                stdout:
                  "/project/node_modules/@canonical/pragma-cli/skills/scaffold-story",
                stderr: "",
                exitCode: 0,
              };
            }
          }
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      ],
    ]);

    const { value } = dryRunWith(task, mocks);
    const result = value as SetupSkillsResult;

    const skipped = result.actions.filter((a) => a.action === "skipped");
    expect(skipped).toHaveLength(6);
    expect(result.warnings).toHaveLength(0);
  });

  it("replaces wrong symlinks with warning", () => {
    const task = setupSkills([MOCK_SKILLS[0]], [MOCK_HARNESSES[0]], "/project");

    const mocks = new Map<string, (e: Effect) => unknown>([
      ["Exists", () => true],
      [
        "Exec",
        () => ({
          stdout: "/wrong/target",
          stderr: "",
          exitCode: 0,
        }),
      ],
    ]);

    const { value } = dryRunWith(task, mocks);
    const result = value as SetupSkillsResult;

    const replaced = result.actions.filter((a) => a.action === "replaced");
    expect(replaced.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("deduplicates cross-client .agents/skills path", () => {
    const harnesses = [
      makeHarness("cline", "Cline", ".agents/skills"),
      makeHarness("opencode", "OpenCode", ".agents/skills"),
    ];

    const task = setupSkills(MOCK_SKILLS, harnesses, "/project");

    const mocks = new Map<string, (e: Effect) => unknown>([
      ["Exists", () => false],
    ]);

    const { value } = dryRunWith(task, mocks);
    const result = value as SetupSkillsResult;

    // Both harnesses use .agents/skills, so only one set of symlinks
    // plus no separate cross-client dir (already covered)
    const created = result.actions.filter((a) => a.action === "created");
    expect(created).toHaveLength(2); // 2 skills × 1 unique dir
  });

  it("handles empty skills list", () => {
    const task = setupSkills([], MOCK_HARNESSES, "/project");

    const { value } = dryRunWith(task, new Map());
    const result = value as SetupSkillsResult;

    expect(result.actions).toHaveLength(0);
    expect(result.skillCount).toBe(0);
  });

  it("handles empty harnesses list", () => {
    const task = setupSkills(MOCK_SKILLS, [], "/project");

    const mocks = new Map<string, (e: Effect) => unknown>([
      ["Exists", () => false],
    ]);

    const { value } = dryRunWith(task, mocks);
    const result = value as SetupSkillsResult;

    // Still creates cross-client .agents/skills
    const created = result.actions.filter((a) => a.action === "created");
    expect(created).toHaveLength(2); // 2 skills × 1 (.agents/skills)
  });
});
