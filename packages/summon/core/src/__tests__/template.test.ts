import { describe, expect, it } from "vitest";
import { dryRun } from "../dry-run.js";
import {
  generatorComment,
  generatorHtmlComment,
  renderString,
  template,
  templateDir,
  templateHelpers,
  withHelpers,
} from "../template.js";

// =============================================================================
// String Rendering
// =============================================================================

describe("Template - renderString", () => {
  it("renders simple variables", () => {
    const result = renderString("Hello, <%= name %>!", { name: "World" });
    expect(result).toBe("Hello, World!");
  });

  it("renders multiple variables", () => {
    const result = renderString("<%= greeting %>, <%= name %>!", {
      greeting: "Hello",
      name: "World",
    });
    expect(result).toBe("Hello, World!");
  });

  it("renders with no variables", () => {
    const result = renderString("No variables here", {});
    expect(result).toBe("No variables here");
  });

  it("renders embedded JavaScript expressions", () => {
    const result = renderString("<%= 2 + 2 %>", {});
    expect(result).toBe("4");
  });

  it("renders conditionals", () => {
    const template = "<% if (show) { %>Visible<% } %>";
    expect(renderString(template, { show: true })).toBe("Visible");
    expect(renderString(template, { show: false })).toBe("");
  });

  it("renders loops", () => {
    const template = "<% items.forEach(item => { %><%= item %> <% }) %>";
    const result = renderString(template, { items: ["a", "b", "c"] });
    expect(result).toBe("a b c ");
  });

  it("escapes HTML by default with <%= %>", () => {
    const result = renderString("<%= html %>", {
      html: "<script>alert('xss')</script>",
    });
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("renders unescaped HTML with <%- %>", () => {
    const result = renderString("<%- html %>", { html: "<div>content</div>" });
    expect(result).toBe("<div>content</div>");
  });

  it("handles nested objects", () => {
    const result = renderString("<%= user.name %> (<%= user.age %>)", {
      user: { name: "John", age: 30 },
    });
    expect(result).toBe("John (30)");
  });

  it("handles array access", () => {
    const result = renderString("<%= items[0] %> and <%= items[1] %>", {
      items: ["first", "second"],
    });
    expect(result).toBe("first and second");
  });

  it("handles functions in variables", () => {
    const result = renderString("<%= format(name) %>", {
      name: "hello",
      format: (s: string) => s.toUpperCase(),
    });
    expect(result).toBe("HELLO");
  });

  it("handles multiline templates", () => {
    const template = `
line 1
<%= middle %>
line 3
`;
    const result = renderString(template, { middle: "line 2" });
    expect(result).toContain("line 1");
    expect(result).toContain("line 2");
    expect(result).toContain("line 3");
  });

  it("handles empty template", () => {
    const result = renderString("", {});
    expect(result).toBe("");
  });

  it("handles template with only whitespace", () => {
    const result = renderString("   \n\t  ", {});
    expect(result).toBe("   \n\t  ");
  });

  it("handles unicode in template", () => {
    const result = renderString("<%= emoji %>", { emoji: "\u{1F600}" });
    expect(result).toBe("\u{1F600}");
  });

  it("handles special characters in variables", () => {
    const result = renderString("<%= special %>", {
      special: 'Special: @#$%^&*()[]{}|\\;"<>',
    });
    // HTML escaped version
    expect(result).toContain("Special:");
  });
});

// =============================================================================
// Template Task
// =============================================================================

describe("Template - template task", () => {
  it("creates mkdir and writeFile effects", () => {
    const t = template({
      source: "/templates/component.tsx.ejs",
      dest: "/output/Button.tsx",
      vars: { name: "Button" },
    });

    const { effects } = dryRun(t);

    // Should have: mkdir, readFile, writeFile
    expect(effects.some((e) => e._tag === "MakeDir")).toBe(true);
    expect(effects.some((e) => e._tag === "ReadFile")).toBe(true);
    expect(effects.some((e) => e._tag === "WriteFile")).toBe(true);
  });

  it("renders destination path with variables", () => {
    const t = template({
      source: "/templates/component.tsx.ejs",
      dest: "/output/<%= name %>.tsx",
      vars: { name: "Button" },
    });

    const { effects } = dryRun(t);
    const writeEffect = effects.find((e) => e._tag === "WriteFile");

    expect((writeEffect as { path: string }).path).toBe("/output/Button.tsx");
  });

  it("creates parent directory", () => {
    const t = template({
      source: "/templates/test.txt.ejs",
      dest: "/deep/nested/path/file.txt",
      vars: {},
    });

    const { effects } = dryRun(t);
    const mkdirEffect = effects.find((e) => e._tag === "MakeDir");

    expect((mkdirEffect as { path: string }).path).toBe("/deep/nested/path");
  });
});

// =============================================================================
// templateDir Task
// =============================================================================

describe("Template - templateDir task", () => {
  it("creates effects for directory templating", () => {
    const t = templateDir({
      source: "/templates",
      dest: "/output",
      vars: { name: "MyComponent" },
    });

    const { effects } = dryRun(t);

    // Should have glob effect to find templates
    expect(effects.some((e) => e._tag === "Glob")).toBe(true);
  });

  it("handles empty directory (no files matched)", () => {
    const t = templateDir({
      source: "/empty-templates",
      dest: "/output",
      vars: {},
    });

    // Should not throw
    expect(() => dryRun(t)).not.toThrow();
  });
});

// =============================================================================
// Template Helpers
// =============================================================================

describe("Template - templateHelpers", () => {
  describe("camelCase", () => {
    it("converts hyphenated strings", () => {
      expect(templateHelpers.camelCase("my-component")).toBe("myComponent");
    });

    it("converts underscored strings", () => {
      expect(templateHelpers.camelCase("my_component")).toBe("myComponent");
    });

    it("converts space-separated strings", () => {
      expect(templateHelpers.camelCase("my component")).toBe("myComponent");
    });

    it("converts PascalCase to camelCase", () => {
      expect(templateHelpers.camelCase("MyComponent")).toBe("myComponent");
    });

    it("handles multiple separators", () => {
      expect(templateHelpers.camelCase("my-component_name")).toBe(
        "myComponentName",
      );
    });

    it("handles single word", () => {
      expect(templateHelpers.camelCase("component")).toBe("component");
    });

    it("handles empty string", () => {
      expect(templateHelpers.camelCase("")).toBe("");
    });

    it("handles consecutive separators", () => {
      expect(templateHelpers.camelCase("my--component")).toBe("myComponent");
    });
  });

  describe("pascalCase", () => {
    it("converts hyphenated strings", () => {
      expect(templateHelpers.pascalCase("my-component")).toBe("MyComponent");
    });

    it("converts underscored strings", () => {
      expect(templateHelpers.pascalCase("my_component")).toBe("MyComponent");
    });

    it("converts space-separated strings", () => {
      expect(templateHelpers.pascalCase("my component")).toBe("MyComponent");
    });

    it("preserves PascalCase", () => {
      expect(templateHelpers.pascalCase("MyComponent")).toBe("MyComponent");
    });

    it("handles single word", () => {
      expect(templateHelpers.pascalCase("component")).toBe("Component");
    });

    it("handles empty string", () => {
      expect(templateHelpers.pascalCase("")).toBe("");
    });
  });

  describe("kebabCase", () => {
    it("converts camelCase", () => {
      expect(templateHelpers.kebabCase("myComponent")).toBe("my-component");
    });

    it("converts PascalCase", () => {
      expect(templateHelpers.kebabCase("MyComponent")).toBe("my-component");
    });

    it("converts underscored strings", () => {
      expect(templateHelpers.kebabCase("my_component")).toBe("my-component");
    });

    it("converts space-separated strings", () => {
      expect(templateHelpers.kebabCase("my component")).toBe("my-component");
    });

    it("preserves kebab-case", () => {
      expect(templateHelpers.kebabCase("my-component")).toBe("my-component");
    });

    it("handles single word", () => {
      expect(templateHelpers.kebabCase("Component")).toBe("component");
    });

    it("handles empty string", () => {
      expect(templateHelpers.kebabCase("")).toBe("");
    });

    it("handles consecutive uppercase (only splits on lowercase-uppercase boundary)", () => {
      // The implementation only splits on [a-z][A-Z] boundaries
      // So "XMLParser" becomes "xmlparser" (no lowercase before X, M, L)
      expect(templateHelpers.kebabCase("XMLParser")).toBe("xmlparser");
    });

    it("handles mixed case with lowercase-uppercase boundaries", () => {
      // Only splits where lowercase is followed by uppercase
      // "parseXMLDocument": only eX is a lowercase→uppercase boundary
      // So it becomes "parse-xmldocument" (ML, LD are uppercase→uppercase)
      expect(templateHelpers.kebabCase("parseXMLDocument")).toBe(
        "parse-xmldocument",
      );
    });

    it("splits on each lowercase to uppercase transition", () => {
      // "parseXmlDocument" has e→X and l→D transitions
      expect(templateHelpers.kebabCase("parseXmlDocument")).toBe(
        "parse-xml-document",
      );
    });
  });

  describe("snakeCase", () => {
    it("converts camelCase", () => {
      expect(templateHelpers.snakeCase("myComponent")).toBe("my_component");
    });

    it("converts PascalCase", () => {
      expect(templateHelpers.snakeCase("MyComponent")).toBe("my_component");
    });

    it("converts hyphenated strings", () => {
      expect(templateHelpers.snakeCase("my-component")).toBe("my_component");
    });

    it("converts space-separated strings", () => {
      expect(templateHelpers.snakeCase("my component")).toBe("my_component");
    });

    it("preserves snake_case", () => {
      expect(templateHelpers.snakeCase("my_component")).toBe("my_component");
    });

    it("handles single word", () => {
      expect(templateHelpers.snakeCase("Component")).toBe("component");
    });

    it("handles empty string", () => {
      expect(templateHelpers.snakeCase("")).toBe("");
    });
  });

  describe("constantCase", () => {
    it("converts camelCase", () => {
      expect(templateHelpers.constantCase("myComponent")).toBe("MY_COMPONENT");
    });

    it("converts PascalCase", () => {
      expect(templateHelpers.constantCase("MyComponent")).toBe("MY_COMPONENT");
    });

    it("converts hyphenated strings", () => {
      expect(templateHelpers.constantCase("my-component")).toBe("MY_COMPONENT");
    });

    it("converts space-separated strings", () => {
      expect(templateHelpers.constantCase("my component")).toBe("MY_COMPONENT");
    });

    it("handles single word", () => {
      expect(templateHelpers.constantCase("component")).toBe("COMPONENT");
    });

    it("handles empty string", () => {
      expect(templateHelpers.constantCase("")).toBe("");
    });
  });

  describe("capitalize", () => {
    it("capitalizes first letter", () => {
      expect(templateHelpers.capitalize("hello")).toBe("Hello");
    });

    it("preserves rest of string", () => {
      expect(templateHelpers.capitalize("hELLO")).toBe("HELLO");
    });

    it("handles single character", () => {
      expect(templateHelpers.capitalize("h")).toBe("H");
    });

    it("handles empty string", () => {
      expect(templateHelpers.capitalize("")).toBe("");
    });

    it("handles already capitalized", () => {
      expect(templateHelpers.capitalize("Hello")).toBe("Hello");
    });
  });

  describe("isoDate", () => {
    it("returns ISO date string", () => {
      const result = templateHelpers.isoDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("year", () => {
    it("returns current year", () => {
      const result = templateHelpers.year();
      expect(result).toBe(new Date().getFullYear());
    });
  });

  describe("indent", () => {
    it("indents single line", () => {
      expect(templateHelpers.indent("hello", 2)).toBe("  hello");
    });

    it("indents multiple lines", () => {
      const input = "line1\nline2\nline3";
      const expected = "  line1\n  line2\n  line3";
      expect(templateHelpers.indent(input, 2)).toBe(expected);
    });

    it("handles zero indent", () => {
      expect(templateHelpers.indent("hello", 0)).toBe("hello");
    });

    it("handles large indent", () => {
      expect(templateHelpers.indent("hello", 10)).toBe("          hello");
    });

    it("handles empty string", () => {
      expect(templateHelpers.indent("", 2)).toBe("  ");
    });

    it("handles empty lines", () => {
      expect(templateHelpers.indent("a\n\nb", 2)).toBe("  a\n  \n  b");
    });
  });

  describe("join", () => {
    it("joins array with default separator", () => {
      expect(templateHelpers.join(["a", "b", "c"])).toBe("a, b, c");
    });

    it("joins array with custom separator", () => {
      expect(templateHelpers.join(["a", "b", "c"], " | ")).toBe("a | b | c");
    });

    it("handles empty array", () => {
      expect(templateHelpers.join([])).toBe("");
    });

    it("handles single item", () => {
      expect(templateHelpers.join(["single"])).toBe("single");
    });

    it("converts non-string items", () => {
      expect(templateHelpers.join([1, 2, 3])).toBe("1, 2, 3");
    });

    it("handles mixed types", () => {
      expect(templateHelpers.join([1, "two", true])).toBe("1, two, true");
    });
  });

  describe("pluralize", () => {
    it("returns singular for count of 1", () => {
      expect(templateHelpers.pluralize("item", 1)).toBe("item");
    });

    it("returns plural for count of 0", () => {
      expect(templateHelpers.pluralize("item", 0)).toBe("items");
    });

    it("returns plural for count > 1", () => {
      expect(templateHelpers.pluralize("item", 5)).toBe("items");
    });

    it("handles negative counts", () => {
      expect(templateHelpers.pluralize("item", -1)).toBe("items");
    });
  });
});

// =============================================================================
// withHelpers
// =============================================================================

describe("Template - withHelpers", () => {
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

// =============================================================================
// Generator Comments
// =============================================================================

describe("Template - generatorComment", () => {
  it("generates basic comment", () => {
    const result = generatorComment("ComponentGenerator");
    expect(result).toBe("// Generated by ComponentGenerator");
  });

  it("includes version when specified", () => {
    const result = generatorComment("ComponentGenerator", { version: "1.0.0" });
    expect(result).toBe("// Generated by ComponentGenerator v1.0.0");
  });

  it("includes timestamp when specified", () => {
    const result = generatorComment("ComponentGenerator", { timestamp: true });
    expect(result).toMatch(
      /^\/\/ Generated by ComponentGenerator on \d{4}-\d{2}-\d{2}/,
    );
  });

  it("includes both version and timestamp", () => {
    const result = generatorComment("ComponentGenerator", {
      version: "2.0.0",
      timestamp: true,
    });
    expect(result).toMatch(
      /^\/\/ Generated by ComponentGenerator v2\.0\.0 on \d{4}/,
    );
  });

  it("handles generator name with spaces", () => {
    const result = generatorComment("My Generator");
    expect(result).toBe("// Generated by My Generator");
  });
});

describe("Template - generatorHtmlComment", () => {
  it("generates basic HTML comment", () => {
    const result = generatorHtmlComment("ComponentGenerator");
    expect(result).toBe("<!-- Generated by ComponentGenerator -->");
  });

  it("includes version when specified", () => {
    const result = generatorHtmlComment("ComponentGenerator", {
      version: "1.0.0",
    });
    expect(result).toBe("<!-- Generated by ComponentGenerator v1.0.0 -->");
  });

  it("includes timestamp when specified", () => {
    const result = generatorHtmlComment("ComponentGenerator", {
      timestamp: true,
    });
    expect(result).toMatch(
      /^<!-- Generated by ComponentGenerator on \d{4}-\d{2}-\d{2}/,
    );
  });

  it("includes both version and timestamp", () => {
    const result = generatorHtmlComment("ComponentGenerator", {
      version: "2.0.0",
      timestamp: true,
    });
    expect(result).toMatch(
      /^<!-- Generated by ComponentGenerator v2\.0\.0 on \d{4}/,
    );
  });
});

// =============================================================================
// Integration with Templates
// =============================================================================

describe("Template - Integration", () => {
  it("can use helpers in templates", () => {
    const vars = withHelpers({
      componentName: "my-button",
      properties: ["label", "onClick", "disabled"],
    });

    const template = `
export const <%= pascalCase(componentName) %> = () => {
  // Props: <%= join(properties) %>
};
`;

    const result = renderString(template, vars);

    expect(result).toContain("export const MyButton = () => {");
    expect(result).toContain("// Props: label, onClick, disabled");
  });

  it("can generate TypeScript interfaces", () => {
    const vars = withHelpers({
      interfaceName: "button-props",
      properties: [
        { name: "label", type: "string" },
        { name: "onClick", type: "() => void" },
        { name: "disabled", type: "boolean" },
      ],
    });

    // Use <%- for unescaped output since types can contain < and >
    const template = `
interface <%= pascalCase(interfaceName) %> {
<% properties.forEach(prop => { %>
  <%= prop.name %>: <%- prop.type %>;
<% }) %>
}
`;

    const result = renderString(template, vars);

    expect(result).toContain("interface ButtonProps {");
    expect(result).toContain("label: string;");
    expect(result).toContain("onClick: () => void;");
    expect(result).toContain("disabled: boolean;");
  });

  it("can generate import statements", () => {
    const vars = withHelpers({
      imports: [
        { from: "react", names: ["useState", "useEffect"] },
        { from: "./types", names: ["Props"] },
      ],
    });

    const template = `
<% imports.forEach(imp => { %>
import { <%= join(imp.names) %> } from '<%= imp.from %>';
<% }) %>
`;

    const result = renderString(template, vars);

    expect(result).toContain("import { useState, useEffect } from 'react';");
    expect(result).toContain("import { Props } from './types';");
  });
});
