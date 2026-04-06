import { describe, expect, it, vi } from "vitest";
import createOutputAdapter, {
  detectRenderMode,
} from "./createOutputAdapter.js";
import type { RenderPair } from "./types.js";

describe("createOutputAdapter", () => {
  describe("detectRenderMode", () => {
    it("returns plain for default flags", () => {
      expect(detectRenderMode({ llm: false, format: "text" })).toBe("plain");
    });

    it("returns plain for llm mode", () => {
      expect(detectRenderMode({ llm: true, format: "text" })).toBe("plain");
    });

    it("returns plain for json format", () => {
      expect(detectRenderMode({ llm: false, format: "json" })).toBe("plain");
    });
  });

  describe("createOutputAdapter", () => {
    it("creates adapter with correct mode", () => {
      const adapter = createOutputAdapter("plain");
      expect(adapter.mode).toBe("plain");
    });

    it("renders data via plain renderer", () => {
      const adapter = createOutputAdapter("plain");
      const render: RenderPair<number> = {
        plain: (n) => `Count: ${n}`,
      };

      const chunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        chunks.push(chunk);
        return true;
      }) as typeof process.stdout.write;

      try {
        adapter.render(42, render);
      } finally {
        process.stdout.write = originalWrite;
      }

      expect(chunks.join("")).toContain("Count: 42");
    });

    it("does not write when plain renderer returns empty string", () => {
      const adapter = createOutputAdapter("plain");
      const render: RenderPair<null> = {
        plain: () => "",
      };

      const spy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      try {
        adapter.render(null, render);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it("ink mode falls back to plain rendering in v0.1", () => {
      const adapter = createOutputAdapter("ink");
      expect(adapter.mode).toBe("ink");

      const render: RenderPair<string> = {
        plain: (s) => s,
        ink: (s) => ({ type: "Text", children: s }),
      };

      const chunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        chunks.push(chunk);
        return true;
      }) as typeof process.stdout.write;

      try {
        adapter.render("test", render);
      } finally {
        process.stdout.write = originalWrite;
      }

      expect(chunks.join("")).toContain("test");
    });

    it("ink mode does not write when plain renderer returns empty string", () => {
      const adapter = createOutputAdapter("ink");
      const render: RenderPair<null> = {
        plain: () => "",
      };

      const spy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      try {
        adapter.render(null, render);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("detectRenderMode — TTY detection", () => {
    it("returns ink when stdout is a TTY and no machine-readable flags are set", () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        process.stdout,
        "isTTY",
      );

      Object.defineProperty(process.stdout, "isTTY", {
        configurable: true,
        value: true,
      });

      try {
        expect(detectRenderMode({ llm: false, format: "text" })).toBe("ink");
      } finally {
        if (descriptor) {
          Object.defineProperty(process.stdout, "isTTY", descriptor);
        } else {
          delete (process.stdout as Record<string, unknown>).isTTY;
        }
      }
    });
  });
});
