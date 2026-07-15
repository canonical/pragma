import { describe, expect, it } from "vitest";
import bundledGeneratorPacks from "./bundled.js";

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
