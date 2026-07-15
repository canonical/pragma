import type { CommandContext } from "@canonical/cli-core";
import { describe, expect, it } from "vitest";
import buildApplicationCommand from "./application.js";

const ctx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text" as const, verbose: false },
};

describe("buildApplicationCommand", () => {
  it("has correct path", () => {
    const cmd = buildApplicationCommand();
    expect(cmd.path).toEqual(["create", "application"]);
  });

  it("dry-run with all params returns output", async () => {
    const cmd = buildApplicationCommand();
    const result = await cmd.execute(
      {
        appPath: "my-app",
        ssr: true,
        router: true,
        dryRun: true,
        yes: true,
      },
      ctx,
    );
    expect(result.tag).toBe("output");
  });

  it("with missing required params returns batch output outside a TTY", async () => {
    const cmd = buildApplicationCommand();
    const result = await cmd.execute({}, ctx);
    expect(result.tag).toBe("output");
  });
});
