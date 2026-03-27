import { describe, expect, it } from "vitest";
import renderString from "./renderString.js";

describe("renderString", () => {
  it("renders simple variables", () => {
    expect(renderString("Hello, <%= name %>!", { name: "World" })).toBe(
      "Hello, World!",
    );
  });

  it("renders multiple variables", () => {
    expect(
      renderString("<%= greeting %>, <%= name %>!", {
        greeting: "Hello",
        name: "World",
      }),
    ).toBe("Hello, World!");
  });

  it("renders with no variables", () => {
    expect(renderString("No variables here", {})).toBe("No variables here");
  });

  it("renders embedded JavaScript expressions", () => {
    expect(renderString("<%= 2 + 2 %>", {})).toBe("4");
  });

  it("renders conditionals", () => {
    const tpl = "<% if (show) { %>Visible<% } %>";
    expect(renderString(tpl, { show: true })).toBe("Visible");
    expect(renderString(tpl, { show: false })).toBe("");
  });

  it("renders loops", () => {
    const tpl = "<% items.forEach(item => { %><%= item %> <% }) %>";
    expect(renderString(tpl, { items: ["a", "b", "c"] })).toBe("a b c ");
  });

  it("escapes HTML by default with <%= %>", () => {
    const result = renderString("<%= html %>", {
      html: "<script>alert('xss')</script>",
    });
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("renders unescaped HTML with <%- %>", () => {
    expect(renderString("<%- html %>", { html: "<div>content</div>" })).toBe(
      "<div>content</div>",
    );
  });

  it("handles nested objects", () => {
    expect(
      renderString("<%= user.name %> (<%= user.age %>)", {
        user: { name: "John", age: 30 },
      }),
    ).toBe("John (30)");
  });

  it("handles array access", () => {
    expect(
      renderString("<%= items[0] %> and <%= items[1] %>", {
        items: ["first", "second"],
      }),
    ).toBe("first and second");
  });

  it("handles functions in variables", () => {
    expect(
      renderString("<%= format(name) %>", {
        name: "hello",
        format: (s: string) => s.toUpperCase(),
      }),
    ).toBe("HELLO");
  });

  it("handles multiline templates", () => {
    const result = renderString(`\nline 1\n<%= middle %>\nline 3\n`, {
      middle: "line 2",
    });
    expect(result).toContain("line 1");
    expect(result).toContain("line 2");
    expect(result).toContain("line 3");
  });

  it("handles empty template", () => {
    expect(renderString("", {})).toBe("");
  });

  it("handles template with only whitespace", () => {
    expect(renderString("   \n\t  ", {})).toBe("   \n\t  ");
  });

  it("handles unicode in template", () => {
    expect(renderString("<%= emoji %>", { emoji: "\u{1F600}" })).toBe(
      "\u{1F600}",
    );
  });

  it("handles special characters in variables", () => {
    const result = renderString("<%= special %>", {
      special: 'Special: @#$%^&*()[]{}|\\;"<>',
    });
    expect(result).toContain("Special:");
  });
});
