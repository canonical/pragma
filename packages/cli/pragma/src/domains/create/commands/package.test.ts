import type { CommandContext } from "@canonical/cli-core";
import { describe, expect, it } from "vitest";
import buildPackageCommand from "./package.js";

const ctx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text" as const, verbose: false },
};

describe("buildPackageCommand", () => {
  it("has correct path", () => {
    const cmd = buildPackageCommand();
    expect(cmd.path).toEqual(["create", "package"]);
  });

  it("dry-run with all params returns output", async () => {
    const cmd = buildPackageCommand();
    const result = await cmd.execute(
      {
        name: "@canonical/test-pkg",
        type: "tool-ts",
        dryRun: true,
        yes: true,
      },
      ctx,
    );
    expect(result.tag).toBe("output");
  });

  it("with missing required params returns interactive", async () => {
    const cmd = buildPackageCommand();
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("interactive");
  });
});
