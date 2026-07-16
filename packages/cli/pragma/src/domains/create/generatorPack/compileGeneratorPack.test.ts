import type { AnyGenerator } from "@canonical/summon-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PragmaRuntime } from "../../shared/types/index.js";
import bundledGeneratorPacks from "./bundled.js";
import compileGeneratorPack from "./compileGeneratorPack.js";

describe("compileGeneratorPack (bundled)", () => {
  const { commands, specs } = bundledGeneratorPacks();
  const cliPaths = commands.map((c) => c.path.join(" "));
  const toolNames = specs.map((s) => s.name);

  it("exposes every generator from every bundled package as a create command", () => {
    // component (react/svelte/lit → one noun), package, and the four
    // application-package generators.
    expect(cliPaths).toEqual([
      "create component",
      "create package",
      "create application",
      "create domain",
      "create route",
      "create wrapper",
    ]);
  });

  it("emits a matching MCP tool per noun", () => {
    expect(toolNames).toEqual([
      "create_component",
      "create_package",
      "create_application",
      "create_domain",
      "create_route",
      "create_wrapper",
    ]);
  });

  it("dispatches a multi-variant noun via a `variant` positional select", () => {
    const component = commands.find(
      (c) => c.path.join(" ") === "create component",
    );
    const variant = component?.parameters.find((p) => p.name === "variant");
    expect(variant?.type).toBe("select");
    expect(variant?.positional).toBe(true);
    expect(variant?.choices?.map((ch) => ch.value)).toEqual([
      "react",
      "svelte",
      "lit",
    ]);
  });

  it("gives the multi-variant MCP tool a `variant` enum parameter", () => {
    const component = specs.find((s) => s.name === "create_component");
    expect(component?.params?.variant?.enum).toEqual([
      "react",
      "svelte",
      "lit",
    ]);
  });

  it("collapses a single-variant noun to a plain `create <noun>` (no variant arg)", () => {
    const application = commands.find(
      (c) => c.path.join(" ") === "create application",
    );
    expect(application?.parameters.some((p) => p.name === "variant")).toBe(
      false,
    );
    // Its prompts still project — appPath comes from the generator.
    expect(application?.parameters.some((p) => p.name === "appPath")).toBe(
      true,
    );
  });

  it("derives single-generator MCP params from the generator's prompts", () => {
    const pkg = specs.find((s) => s.name === "create_package");
    expect(pkg?.params).toBeDefined();
    // The package generator prompts for a package name.
    expect(Object.keys(pkg?.params ?? {}).length).toBeGreaterThan(0);
  });
});

/** Minimal synthetic generator for edge-case tests. */
function makeGenerator(name: string, generate?: () => never): AnyGenerator {
  return {
    meta: {
      name,
      displayName: name,
      description: `Test generator ${name}`,
      version: "0.0.0",
    },
    prompts: [],
    generate:
      generate ??
      (() => {
        throw new Error("not exercised");
      }),
  } as unknown as AnyGenerator;
}

describe("compileGeneratorPack — edge cases", () => {
  let warnings: string[];
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnings = [];
    warn = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        warnings.push(String(chunk));
        return true;
      });
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("warns and exposes only the first generator of a mixed bare/variant noun", () => {
    const { commands, specs } = compileGeneratorPack({
      thing: makeGenerator("thing"),
      "thing/extra": makeGenerator("thing/extra"),
    });
    expect(commands.map((c) => c.path.join(" "))).toEqual(["create thing"]);
    expect(specs.map((s) => s.name)).toEqual(["create_thing"]);
    expect(warnings.join("")).toContain("mixes bare and variant keys");
  });

  it("maps a generator that throws to INVALID_INPUT with its message as recovery", async () => {
    const throwing = makeGenerator("boom", () => {
      throw new Error("boom requires --both flags");
    });
    const { specs } = compileGeneratorPack({ boom: throwing });
    const spec = specs.at(0);
    const rt = { cwd: "/tmp" } as PragmaRuntime;
    await expect(spec?.execute(rt, {})).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: { message: "boom requires --both flags" },
    });
  });

  it("rejects an unknown variant with INVALID_INPUT and the valid options", async () => {
    const { specs } = compileGeneratorPack({
      "widget/a": makeGenerator("widget/a"),
      "widget/b": makeGenerator("widget/b"),
    });
    const spec = specs.at(0);
    const rt = { cwd: "/tmp" } as PragmaRuntime;
    await expect(spec?.execute(rt, { variant: "c" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      validOptions: ["a", "b"],
    });
  });
});
