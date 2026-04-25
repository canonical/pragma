import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import loadFullSchema from "./loadFullSchema.js";

describe("loadFullSchema", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-schema-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("loads a schema without extends", async () => {
    const schema = {
      name: "simple",
      "my-rule": {
        file: { name: "test.json", contains: { type: "object" } },
      },
    };
    const schemaPath = join(tmp, "simple.ruleset.json");
    writeFileSync(schemaPath, JSON.stringify(schema));

    const result = await loadFullSchema(schemaPath);
    expect(result.name).toBe("simple");
    expect(result["my-rule"]).toBeDefined();
  });

  it("merges rules from extended schemas", async () => {
    const baseSchema = {
      name: "base",
      "base-rule": {
        file: { name: "base.json", contains: { type: "object" } },
      },
    };
    const childSchema = {
      name: "child",
      extends: [join(tmp, "base.ruleset.json")],
      "child-rule": {
        file: { name: "child.json", contains: { type: "string" } },
      },
    };

    writeFileSync(join(tmp, "base.ruleset.json"), JSON.stringify(baseSchema));
    writeFileSync(join(tmp, "child.ruleset.json"), JSON.stringify(childSchema));

    const result = await loadFullSchema(join(tmp, "child.ruleset.json"));
    expect(result.name).toBe("child");
    expect(result["base-rule"]).toBeDefined();
    expect(result["child-rule"]).toBeDefined();
  });

  it("child rules override parent rules with same name", async () => {
    const parent = {
      name: "parent",
      "shared-rule": {
        file: { name: "parent.json", contains: { type: "string" } },
      },
    };
    const child = {
      name: "child",
      extends: [join(tmp, "parent.ruleset.json")],
      "shared-rule": {
        file: { name: "child.json", contains: { type: "number" } },
      },
    };

    writeFileSync(join(tmp, "parent.ruleset.json"), JSON.stringify(parent));
    writeFileSync(join(tmp, "child.ruleset.json"), JSON.stringify(child));

    const result = await loadFullSchema(join(tmp, "child.ruleset.json"));
    const rule = result["shared-rule"] as { file: { name: string } };
    expect(rule.file.name).toBe("child.json");
  });

  it("preserves $schema and name from child", async () => {
    const parent = {
      $schema: "parent-schema",
      name: "parent",
    };
    const child = {
      $schema: "child-schema",
      name: "child",
      extends: [join(tmp, "parent.ruleset.json")],
    };

    writeFileSync(join(tmp, "parent.ruleset.json"), JSON.stringify(parent));
    writeFileSync(join(tmp, "child.ruleset.json"), JSON.stringify(child));

    const result = await loadFullSchema(join(tmp, "child.ruleset.json"));
    expect(result.$schema).toBe("child-schema");
    expect(result.name).toBe("child");
  });

  it("handles multiple extends", async () => {
    const base1 = {
      name: "base1",
      rule1: {
        file: { name: "a.json", contains: { type: "object" } },
      },
    };
    const base2 = {
      name: "base2",
      rule2: {
        file: { name: "b.json", contains: { type: "object" } },
      },
    };
    const child = {
      name: "child",
      extends: [
        join(tmp, "base1.ruleset.json"),
        join(tmp, "base2.ruleset.json"),
      ],
    };

    writeFileSync(join(tmp, "base1.ruleset.json"), JSON.stringify(base1));
    writeFileSync(join(tmp, "base2.ruleset.json"), JSON.stringify(base2));
    writeFileSync(join(tmp, "child.ruleset.json"), JSON.stringify(child));

    const result = await loadFullSchema(join(tmp, "child.ruleset.json"));
    expect(result.rule1).toBeDefined();
    expect(result.rule2).toBeDefined();
  });
});
