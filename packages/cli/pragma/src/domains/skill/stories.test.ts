import { describe, expect, it } from "vitest";
import { skillListStory } from "./stories.js";
import type { SkillSource } from "./types.js";

const availableSource: SkillSource = {
  path: "/pkgs/design-system/skills/design-auditor",
  packageName: "@canonical/design-system",
  available: true,
};

const unavailableSource: SkillSource = {
  path: "/pkgs/missing/skills/gone",
  packageName: "@canonical/missing",
  available: false,
};

describe("skillListStory", () => {
  it("passes the CLI detailed flag into the formatter input", () => {
    const data = { skills: [], sources: [] };
    expect(skillListStory.toOutput(data, { detailed: true }).detailed).toBe(
      true,
    );
    expect(skillListStory.toOutput(data, {}).detailed).toBe(false);
  });

  it("suggests installing packages when no source is available", () => {
    const error = skillListStory.emptyError?.(
      { skills: [], sources: [unavailableSource] },
      {},
    );
    expect(error?.recovery?.message).toBe("Install @canonical packages first");
  });

  it("reports missing SKILL.md files when sources are available", () => {
    const error = skillListStory.emptyError?.(
      { skills: [], sources: [availableSource] },
      {},
    );
    expect(error?.recovery?.message).toBe(
      "No SKILL.md files found in source packages",
    );
  });
});
