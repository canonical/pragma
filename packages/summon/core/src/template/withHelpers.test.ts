import { describe, expect, it } from "vitest";
import renderString from "./renderString.js";
import templateHelpers from "./templateHelpers.js";
import withHelpers from "./withHelpers.js";

describe("withHelpers", () => {
  it("includes all template helpers", () => {
    const vars = withHelpers({ name: "test" });

    expect(vars.camelCase).toBe(templateHelpers.camelCase);
    expect(vars.pascalCase).toBe(templateHelpers.pascalCase);
    expect(vars.kebabCase).toBe(templateHelpers.kebabCase);
    expect(vars.snakeCase).toBe(templateHelpers.snakeCase);
    expect(vars.constantCase).toBe(templateHelpers.constantCase);
    expect(vars.capitalize).toBe(templateHelpers.capitalize);
    expect(vars.indent).toBe(templateHelpers.indent);
    expect(vars.join).toBe(templateHelpers.join);
    expect(vars.pluralize).toBe(templateHelpers.pluralize);
  });

  it("preserves user variables", () => {
    const vars = withHelpers({ name: "MyComponent", version: "1.0.0" });

    expect(vars.name).toBe("MyComponent");
    expect(vars.version).toBe("1.0.0");
  });

  it("user variables override helpers", () => {
    const customCapitalize = (s: string) => `CUSTOM: ${s}`;
    const vars = withHelpers({ capitalize: customCapitalize });

    expect(vars.capitalize).toBe(customCapitalize);
  });

  it("works with renderString", () => {
    const vars = withHelpers({ name: "my-component" });
    const result = renderString("<%= pascalCase(name) %>", vars);

    expect(result).toBe("MyComponent");
  });
});
