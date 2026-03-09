/**
 * Tests for @canonical/summon-component generators
 *
 * Uses dry-run to verify generator output without writing files.
 * Uses dryRunWith with ReadFile mock to test template rendering.
 */

import * as fs from "node:fs";
import { dryRun, dryRunWith, type Effect } from "@canonical/summon";
import { describe, expect, it } from "vitest";
import { generators } from "../index.js";

/**
 * Helper: dry-run with actual file reading for templates.
 * This allows testing template output without writing files.
 */
const dryRunWithTemplates = <A>(task: import("@canonical/summon").Task<A>) => {
  const mocks = new Map<string, (effect: Effect) => unknown>([
    [
      "ReadFile",
      (effect) => {
        const e = effect as { path: string };
        // Actually read template files
        if (e.path.endsWith(".ejs")) {
          return fs.readFileSync(e.path, "utf-8");
        }
        return `[mock content of ${e.path}]`;
      },
    ],
  ]);
  return dryRunWith(task, mocks);
};

describe("generators barrel", () => {
  it("exports component/react generator", () => {
    expect(generators["component/react"]).toBeDefined();
    expect(generators["component/react"].meta.name).toBe("component/react");
  });

  it("exports component/svelte generator", () => {
    expect(generators["component/svelte"]).toBeDefined();
    expect(generators["component/svelte"].meta.name).toBe("component/svelte");
  });
});

describe("component/react generator", () => {
  const generator = generators["component/react"];

  describe("meta", () => {
    it("has correct name", () => {
      expect(generator.meta.name).toBe("component/react");
    });

    it("has description", () => {
      expect(generator.meta.description).toContain("React component");
    });

    it("has version", () => {
      expect(generator.meta.version).toBe("0.1.0");
    });

    it("has help text", () => {
      expect(generator.meta.help).toBeDefined();
      expect(generator.meta.help).toContain("TypeScript");
    });

    it("has examples", () => {
      expect(generator.meta.examples).toBeDefined();
      expect(generator.meta.examples?.length).toBeGreaterThan(0);
    });
  });

  describe("prompts", () => {
    it("has componentPath prompt", () => {
      const prompt = generator.prompts.find((p) => p.name === "componentPath");
      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("text");
      expect(prompt?.default).toBe("src/components/MyComponent");
    });

    it("has withStyles prompt", () => {
      const prompt = generator.prompts.find((p) => p.name === "withStyles");
      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("confirm");
      expect(prompt?.default).toBe(true);
    });

    it("has withStories prompt", () => {
      const prompt = generator.prompts.find((p) => p.name === "withStories");
      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("confirm");
      expect(prompt?.default).toBe(true);
    });

    it("has withSsrTests prompt", () => {
      const prompt = generator.prompts.find((p) => p.name === "withSsrTests");
      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("confirm");
      expect(prompt?.default).toBe(true);
    });
  });

  describe("generate", () => {
    it("creates component files with all options enabled", () => {
      const task = generator.generate({
        componentPath: "src/components/Button",
        withStyles: true,
        withStories: true,
        withSsrTests: true,
      });

      const result = dryRun(task);
      const paths = result.effects
        .filter((e) => e._tag === "WriteFile")
        .map((e) => (e as { path: string }).path);

      expect(paths).toContain("src/components/Button/Button.tsx");
      expect(paths).toContain("src/components/Button/types.ts");
      expect(paths).toContain("src/components/Button/index.ts");
      expect(paths).toContain("src/components/Button/Button.test.tsx");
      expect(paths).toContain("src/components/Button/Button.ssr.test.tsx");
      expect(paths).toContain("src/components/Button/Button.stories.tsx");
      expect(paths).toContain("src/components/Button/styles.css");
    });

    it("creates minimal component without optional files", () => {
      const task = generator.generate({
        componentPath: "src/components/Icon",
        withStyles: false,
        withStories: false,
        withSsrTests: false,
      });

      const result = dryRun(task);
      const paths = result.effects
        .filter((e) => e._tag === "WriteFile")
        .map((e) => (e as { path: string }).path);

      expect(paths).toContain("src/components/Icon/Icon.tsx");
      expect(paths).toContain("src/components/Icon/types.ts");
      expect(paths).toContain("src/components/Icon/index.ts");
      expect(paths).toContain("src/components/Icon/Icon.test.tsx");
      expect(paths).not.toContain("src/components/Icon/Icon.ssr.test.tsx");
      expect(paths).not.toContain("src/components/Icon/Icon.stories.tsx");
      expect(paths).not.toContain("src/components/Icon/styles.css");
    });

    it("extracts component name from path", () => {
      const task = generator.generate({
        componentPath: "src/components/MyButton",
        withStyles: false,
        withStories: false,
        withSsrTests: false,
      });

      const result = dryRunWithTemplates(task);
      const mainFile = result.effects.find(
        (e) =>
          e._tag === "WriteFile" &&
          (e as { path: string }).path.endsWith("MyButton.tsx"),
      );

      expect(mainFile).toBeDefined();
      const content = (mainFile as { content: string }).content;
      expect(content).toContain("MyButton");
      expect(content).toContain("MyButtonProps");
    });

    it("generates kebab-case class name", () => {
      const task = generator.generate({
        componentPath: "src/components/MyButton",
        withStyles: false,
        withStories: false,
        withSsrTests: false,
      });

      const result = dryRunWithTemplates(task);
      const mainFile = result.effects.find(
        (e) =>
          e._tag === "WriteFile" &&
          (e as { path: string }).path.endsWith("MyButton.tsx"),
      );

      const content = (mainFile as { content: string }).content;
      expect(content).toContain("my-button");
    });

    it("appends export to parent index", () => {
      const task = generator.generate({
        componentPath: "src/components/Card",
        withStyles: false,
        withStories: false,
        withSsrTests: false,
      });

      const result = dryRun(task);
      const parentIndex = result.effects.find(
        (e) =>
          e._tag === "WriteFile" &&
          (e as { path: string }).path === "src/components/index.ts",
      );

      expect(parentIndex).toBeDefined();
      const content = (parentIndex as { content: string }).content;
      expect(content).toContain('export * from "./Card/index.js"');
    });
  });
});

describe("component/svelte generator", () => {
  const generator = generators["component/svelte"];

  describe("meta", () => {
    it("has correct name", () => {
      expect(generator.meta.name).toBe("component/svelte");
    });

    it("has description", () => {
      expect(generator.meta.description).toContain("Svelte");
    });

    it("has version", () => {
      expect(generator.meta.version).toBe("0.1.0");
    });
  });

  describe("prompts", () => {
    it("has componentPath prompt with svelte default", () => {
      const prompt = generator.prompts.find((p) => p.name === "componentPath");
      expect(prompt).toBeDefined();
      expect(prompt?.default).toBe("src/lib/components/MyComponent");
    });

    it("has useTsStories prompt", () => {
      const prompt = generator.prompts.find((p) => p.name === "useTsStories");
      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("confirm");
      expect(prompt?.default).toBe(false);
    });
  });

  describe("generate", () => {
    it("creates svelte component files with all options", () => {
      const task = generator.generate({
        componentPath: "src/lib/components/Button",
        withStyles: true,
        withStories: true,
        useTsStories: false,
        withSsrTests: true,
      });

      const result = dryRun(task);
      const paths = result.effects
        .filter((e) => e._tag === "WriteFile")
        .map((e) => (e as { path: string }).path);

      expect(paths).toContain("src/lib/components/Button/Button.svelte");
      expect(paths).toContain("src/lib/components/Button/types.ts");
      expect(paths).toContain("src/lib/components/Button/index.ts");
      expect(paths).toContain(
        "src/lib/components/Button/Button.svelte.test.ts",
      );
      expect(paths).toContain("src/lib/components/Button/Button.ssr.test.ts");
      expect(paths).toContain(
        "src/lib/components/Button/Button.stories.svelte",
      );
      expect(paths).toContain("src/lib/components/Button/styles.css");
    });

    it("creates typescript stories when useTsStories is true", () => {
      const task = generator.generate({
        componentPath: "src/lib/components/Card",
        withStyles: false,
        withStories: true,
        useTsStories: true,
        withSsrTests: false,
      });

      const result = dryRun(task);
      const paths = result.effects
        .filter((e) => e._tag === "WriteFile")
        .map((e) => (e as { path: string }).path);

      expect(paths).toContain("src/lib/components/Card/Card.stories.ts");
      expect(paths).not.toContain(
        "src/lib/components/Card/Card.stories.svelte",
      );
    });

    it("generates svelte 5 runes syntax", () => {
      const task = generator.generate({
        componentPath: "src/lib/components/Toggle",
        withStyles: false,
        withStories: false,
        useTsStories: false,
        withSsrTests: false,
      });

      const result = dryRunWithTemplates(task);
      const mainFile = result.effects.find(
        (e) =>
          e._tag === "WriteFile" &&
          (e as { path: string }).path.endsWith("Toggle.svelte"),
      );

      const content = (mainFile as { content: string }).content;
      expect(content).toContain("$props()");
      expect(content).toContain("@render children");
    });

    it("imports styles.css when withStyles is enabled", () => {
      const task = generator.generate({
        componentPath: "src/lib/components/Banner",
        withStyles: true,
        withStories: false,
        useTsStories: false,
        withSsrTests: false,
      });

      const result = dryRunWithTemplates(task);
      const mainFile = result.effects.find(
        (e) =>
          e._tag === "WriteFile" &&
          (e as { path: string }).path.endsWith("Banner.svelte"),
      );

      const content = (mainFile as { content: string }).content;
      expect(content).toContain('import "./styles.css";');
      expect(content).not.toContain("<style>");
    });
  });
});
