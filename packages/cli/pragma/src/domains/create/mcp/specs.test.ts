import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import type { PragmaRuntime } from "../../shared/types/runtime.js";
import specs from "./specs.js";

// Only `cwd` is read before the path jail throws.
const rt = { cwd: "/project" } as unknown as PragmaRuntime;

const bySpec = (name: string) => {
  const spec = specs.find((s) => s.name === name);
  if (!spec) throw new Error(`missing spec: ${name}`);
  return spec;
};

describe("create MCP specs — path jail (SEC-2)", () => {
  it("create_component refuses a traversal componentPath before generating", async () => {
    await expect(
      bySpec("create_component").execute(rt, {
        framework: "react",
        componentPath: "../../etc/Button",
      }),
    ).rejects.toBeInstanceOf(PragmaError);
  });

  it("create_component refuses an absolute componentPath", async () => {
    await expect(
      bySpec("create_component").execute(rt, {
        framework: "react",
        componentPath: "/etc/evil/Button",
      }),
    ).rejects.toBeInstanceOf(PragmaError);
  });

  it("create_package refuses a name that traverses through its scope", async () => {
    await expect(
      bySpec("create_package").execute(rt, {
        name: "@scope/../../etc",
        type: "library",
      }),
    ).rejects.toBeInstanceOf(PragmaError);
  });

  it("create_package refuses a double-slash scope that derives an absolute directory", async () => {
    await expect(
      bySpec("create_package").execute(rt, {
        name: "@scope//etc/passwd",
        type: "library",
      }),
    ).rejects.toBeInstanceOf(PragmaError);
  });
});
