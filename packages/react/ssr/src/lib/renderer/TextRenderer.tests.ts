import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import TextRenderer from "./TextRenderer.js";

describe("TextRenderer", () => {
  describe("statusCode and statusReady", () => {
    it("starts with statusCode 200", () => {
      const renderer = new TextRenderer([]);
      expect(renderer.statusCode).toBe(200);
    });

    it("starts with a resolved statusReady", async () => {
      const renderer = new TextRenderer([]);
      await expect(renderer.statusReady).resolves.toBeUndefined();
    });
  });

  describe("buildText", () => {
    it("concatenates results from multiple getters in order", async () => {
      const renderer = new TextRenderer([
        async () => "first",
        async () => "second",
        async () => "third",
      ]);
      const text = await (renderer as any).buildText();
      expect(text).toBe("firstsecondthird");
    });

    it("returns empty string for no getters", async () => {
      const renderer = new TextRenderer([]);
      const text = await (renderer as any).buildText();
      expect(text).toBe("");
    });

    it("preserves whitespace and newlines from getters", async () => {
      const renderer = new TextRenderer([
        async () => "# Title\n\n",
        async () => "Body text.\n",
      ]);
      const text = await (renderer as any).buildText();
      expect(text).toBe("# Title\n\nBody text.\n");
    });

    it("calls getters sequentially, not in parallel", async () => {
      const order: number[] = [];
      const renderer = new TextRenderer([
        async () => {
          order.push(1);
          return "a";
        },
        async () => {
          order.push(2);
          return "b";
        },
      ]);
      await (renderer as any).buildText();
      expect(order).toEqual([1, 2]);
    });
  });

  describe("renderToReadableStream", () => {
    it("returns a ReadableStream and sets statusCode to 200", async () => {
      const renderer = new TextRenderer([async () => "hello"]);
      const stream = await renderer.renderToReadableStream();
      expect(stream).toBeInstanceOf(ReadableStream);
      expect(renderer.statusCode).toBe(200);
    });

    it("stream contains the concatenated text", async () => {
      const renderer = new TextRenderer([
        async () => "# LLMs.txt\n\n",
        async () => "This app does things.\n",
      ]);
      const stream = await renderer.renderToReadableStream();
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }
      const text = new TextDecoder().decode(Buffer.concat(chunks));
      expect(text).toBe("# LLMs.txt\n\nThis app does things.\n");
    });
  });

  describe("renderToPipeableStream", () => {
    it("returns pipe and abort functions", () => {
      const renderer = new TextRenderer([]);
      const result = renderer.renderToPipeableStream();
      expect(typeof result.pipe).toBe("function");
      expect(typeof result.abort).toBe("function");
    });

    it("resolves statusReady and sets statusCode to 200", async () => {
      const renderer = new TextRenderer([async () => "data"]);
      renderer.renderToPipeableStream();
      await renderer.statusReady;
      expect(renderer.statusCode).toBe(200);
    });

    it("abort destroys the stream", () => {
      const renderer = new TextRenderer([]);
      const result = renderer.renderToPipeableStream();
      expect(() => result.abort()).not.toThrow();
    });

    it("pipes text data to a writable stream", async () => {
      const renderer = new TextRenderer([async () => "piped content"]);
      const result = renderer.renderToPipeableStream();
      await renderer.statusReady;

      const chunks: Buffer[] = [];
      const passthrough = new PassThrough();
      passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));

      await new Promise<void>((resolve) => {
        passthrough.on("end", resolve);
        result.pipe(passthrough);
      });

      const body = Buffer.concat(chunks).toString("utf-8");
      expect(body).toBe("piped content");
    });
  });

  describe("renderToString", () => {
    it("returns the text and sets statusCode to 200", async () => {
      const renderer = new TextRenderer([async () => "string output"]);
      const text = await renderer.renderToString();
      expect(text).toBe("string output");
      expect(renderer.statusCode).toBe(200);
    });

    it("handles empty getters", async () => {
      const renderer = new TextRenderer([]);
      const text = await renderer.renderToString();
      expect(text).toBe("");
    });

    it("produces identical output on repeated calls", async () => {
      const renderer = new TextRenderer([async () => "stable"]);
      const a = await renderer.renderToString();
      const b = await renderer.renderToString();
      expect(a).toBe(b);
    });

    it("handles a realistic llms.txt use case", async () => {
      const renderer = new TextRenderer([
        async () => "# My App\n\n> Context for LLMs.\n\n",
        async () => {
          // Simulate dynamic data fetch
          const pages = [
            { title: "Home", url: "/", description: "Landing page" },
            { title: "About", url: "/about", description: "About us" },
          ];
          return pages
            .map((p) => `## ${p.title}\nURL: ${p.url}\n${p.description}`)
            .join("\n\n");
        },
      ]);
      const text = await renderer.renderToString();
      expect(text).toContain("# My App");
      expect(text).toContain("## Home");
      expect(text).toContain("URL: /about");
      expect(text).toContain("About us");
    });
  });
});
