import { describe, expect, it } from "vitest";
import createTemplateContext from "./createTemplateContext.js";

const defaultAnswers = {
  name: "test-monorepo",
  description: "A test monorepo",
  license: "LGPL-3.0" as const,
  typescriptConfig: "@canonical/typescript-config-base",
  repository: "https://github.com/test/test-monorepo",
  bunVersion: "1.3.9",
  runInstall: false,
  initGit: false,
};

describe("createTemplateContext", () => {
  it("creates template context from answers", () => {
    const ctx = createTemplateContext(defaultAnswers);
    expect(ctx.name).toBe("test-monorepo");
    expect(ctx.description).toBe("A test monorepo");
    expect(ctx.license).toBe("LGPL-3.0");
    expect(ctx.typescriptConfig).toBe("@canonical/typescript-config-base");
    expect(ctx.bunVersion).toBe("1.3.9");
    expect(ctx.generatorName).toBe("@canonical/summon-monorepo");
  });
});
