import { describe, expect, it } from "vitest";
import parseFrontmatter from "./parseFrontmatter.js";

describe("parseFrontmatter", () => {
  it("parses valid frontmatter with required fields", () => {
    const content = `---
name: design-audit
description: Audit a component implementation against DS specs
---

# Design Audit

Instructions here.
`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      name: "design-audit",
      description: "Audit a component implementation against DS specs",
    });
  });

  it("parses frontmatter with all optional fields", () => {
    const content = `---
name: design-audit
description: Audit a component implementation against DS specs
license: MIT
compatibility: [claude, cursor, windsurf]
metadata:
  author: canonical
  version: 1.0
---

Body content.
`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      name: "design-audit",
      description: "Audit a component implementation against DS specs",
      license: "MIT",
      compatibility: ["claude", "cursor", "windsurf"],
      metadata: { author: "canonical", version: 1.0 },
    });
  });

  it("returns null for missing frontmatter delimiters", () => {
    expect(parseFrontmatter("# No frontmatter here")).toBeNull();
  });

  it("returns null for empty content", () => {
    expect(parseFrontmatter("")).toBeNull();
  });

  it("returns null when name is missing", () => {
    const content = `---
description: Some description
---`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null when description is missing", () => {
    const content = `---
name: some-skill
---`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null when name is empty string", () => {
    const content = `---
name:
description: Some description
---`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("handles quoted values", () => {
    const content = `---
name: "my-skill"
description: 'A skill with quotes'
---`;
    const result = parseFrontmatter(content);
    expect(result?.name).toBe("my-skill");
    expect(result?.description).toBe("A skill with quotes");
  });

  it("handles metadata with nested keys", () => {
    const content = `---
name: test-skill
description: A test skill
metadata:
  author: canonical
  priority: high
---`;
    const result = parseFrontmatter(content);
    expect(result?.metadata).toEqual({
      author: "canonical",
      priority: "high",
    });
  });

  it("ignores content after closing delimiter", () => {
    const content = `---
name: test-skill
description: A test skill
---

This is the body and should not affect parsing.
name: wrong-name
`;
    const result = parseFrontmatter(content);
    expect(result?.name).toBe("test-skill");
  });

  it("handles single-item compatibility array", () => {
    const content = `---
name: test-skill
description: A test skill
compatibility: [claude]
---`;
    const result = parseFrontmatter(content);
    expect(result?.compatibility).toEqual(["claude"]);
  });
});
