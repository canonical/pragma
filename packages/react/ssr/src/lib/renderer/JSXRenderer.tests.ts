import React from "react";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_DATA_KEY } from "./constants.js";
import JSXRenderer from "./JSXRenderer.js";
import type { ServerEntrypointProps } from "./types.js";

/**
 * The protected surface of `JSXRenderer` that these unit tests exercise
 * directly. Casting the renderer to this type keeps the private methods
 * type-checked (arguments and return values) instead of erasing them with `any`.
 */
interface JSXRendererInternals {
  getComponentProps(): ServerEntrypointProps<Record<string, unknown>>;
  getScriptSourcesByType(
    scripts: React.ReactElement[],
    type: "module" | "classic",
  ): string[];
  enrichRendererOptions(
    props: ServerEntrypointProps<Record<string, unknown>>,
  ): RenderToPipeableStreamOptions;
}

const asInternals = (
  renderer: JSXRenderer<
    React.ComponentType<ServerEntrypointProps<Record<string, unknown>>>,
    Record<string, unknown>
  >,
): JSXRendererInternals => renderer as unknown as JSXRendererInternals;

const TestComponent: React.FC<
  ServerEntrypointProps<Record<string, unknown>>
> = (props) => React.createElement("html", { lang: props.lang }, "Hello");

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <script type="module" src="/main.js"></script>
  <script src="/legacy.js"></script>
  <link rel="stylesheet" href="/style.css">
</head>
<body></body>
</html>`;

describe("JSXRenderer", () => {
  describe("constructor", () => {
    it("creates an extractor when htmlString is provided", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { htmlString: SAMPLE_HTML },
      );
      const props = asInternals(renderer).getComponentProps();
      expect(props.scriptElements).toBeDefined();
      expect(props.linkElements).toBeDefined();
    });

    it("does not create an extractor when htmlString is not provided", () => {
      const renderer = new JSXRenderer(TestComponent);
      const props = asInternals(renderer).getComponentProps();
      expect(props.scriptElements).toBeUndefined();
      expect(props.linkElements).toBeUndefined();
      expect(props.otherHeadElements).toBeUndefined();
    });
  });

  describe("statusCode and statusReady", () => {
    it("starts with statusCode 200", () => {
      const renderer = new JSXRenderer(TestComponent);
      expect(renderer.statusCode).toBe(200);
    });

    it("starts with a resolved statusReady", async () => {
      const renderer = new JSXRenderer(TestComponent);
      await expect(renderer.statusReady).resolves.toBeUndefined();
    });
  });

  describe("getLocale", () => {
    it("returns 'en' by default", () => {
      const renderer = new JSXRenderer(TestComponent);
      expect(renderer.getLocale()).toBe("en");
    });

    it("returns the configured locale", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { defaultLocale: "fr" },
      );
      expect(renderer.getLocale()).toBe("fr");
    });
  });

  describe("getComponentProps", () => {
    it("returns correct shape with extractor", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        { foo: "bar" },
        { htmlString: SAMPLE_HTML },
      );
      const props = asInternals(renderer).getComponentProps();
      expect(props.lang).toBe("en");
      expect(props.initialData).toEqual({ foo: "bar" });
      expect(props.scriptElements).toHaveLength(2);
      expect(props.linkElements).toHaveLength(1);
    });

    it("returns undefined elements without extractor", () => {
      const renderer = new JSXRenderer(TestComponent, { foo: "bar" });
      const props = asInternals(renderer).getComponentProps();
      expect(props.lang).toBe("en");
      expect(props.initialData).toEqual({ foo: "bar" });
      expect(props.scriptElements).toBeUndefined();
      expect(props.linkElements).toBeUndefined();
    });
  });

  describe("getScriptSourcesByType", () => {
    it("filters module scripts", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { htmlString: SAMPLE_HTML },
      );
      const props = asInternals(renderer).getComponentProps();
      const modules = asInternals(renderer).getScriptSourcesByType(
        props.scriptElements,
        "module",
      );
      expect(modules).toEqual(["/main.js"]);
    });

    it("filters classic scripts", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { htmlString: SAMPLE_HTML },
      );
      const props = asInternals(renderer).getComponentProps();
      const classic = asInternals(renderer).getScriptSourcesByType(
        props.scriptElements,
        "classic",
      );
      expect(classic).toEqual(["/legacy.js"]);
    });

    it("excludes scripts without src attribute", () => {
      const html =
        '<html><head><script>console.log("inline")</script><script src="/real.js"></script></head></html>';
      const renderer = new JSXRenderer(TestComponent, {}, { htmlString: html });
      const props = asInternals(renderer).getComponentProps();
      const classic = asInternals(renderer).getScriptSourcesByType(
        props.scriptElements,
        "classic",
      );
      expect(classic).toEqual(["/real.js"]);
    });
  });

  describe("enrichRendererOptions", () => {
    it("serializes initialData with XSS escaping", () => {
      const data = { xss: '</script><script>alert("xss")</script>' };
      const renderer = new JSXRenderer(TestComponent, data);
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScriptContent).toContain("\\u003c");
      expect(options.bootstrapScriptContent).not.toContain("</script>");
      expect(options.bootstrapScriptContent).toContain(
        `window.${INITIAL_DATA_KEY}`,
      );
    });

    it("does not override user-provided bootstrapScriptContent", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        { foo: "bar" },
        {
          renderToPipeableStreamOptions: {
            bootstrapScriptContent: "custom content",
          },
        },
      );
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScriptContent).toBe("custom content");
    });

    it("does not override user-provided bootstrapScripts", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        {
          htmlString: SAMPLE_HTML,
          renderToPipeableStreamOptions: {
            bootstrapScripts: ["/custom.js"],
          },
        },
      );
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScripts).toEqual(["/custom.js"]);
    });

    it("does not override user-provided bootstrapModules", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        {
          htmlString: SAMPLE_HTML,
          renderToPipeableStreamOptions: {
            bootstrapModules: ["/custom-module.js"],
          },
        },
      );
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapModules).toEqual(["/custom-module.js"]);
    });

    it("sets bootstrapScriptContent when initialData is truthy", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {} as Record<string, unknown>,
        { renderToPipeableStreamOptions: {} },
      );
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScriptContent).toBeDefined();
    });

    it("does not set bootstrapScriptContent when initialData is falsy", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        undefined as unknown as Record<string, unknown>,
      );
      const props = asInternals(renderer).getComponentProps();
      props.initialData = undefined;
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScriptContent).toBeUndefined();
    });

    it("populates bootstrapScripts and bootstrapModules from scriptElements", () => {
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { htmlString: SAMPLE_HTML },
      );
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScripts).toEqual(["/legacy.js"]);
      expect(options.bootstrapModules).toEqual(["/main.js"]);
    });

    it("does not set bootstrapScripts/Modules when no scriptElements", () => {
      const renderer = new JSXRenderer(TestComponent, {});
      const props = asInternals(renderer).getComponentProps();
      const options = asInternals(renderer).enrichRendererOptions(props);
      expect(options.bootstrapScripts).toBeUndefined();
      expect(options.bootstrapModules).toBeUndefined();
    });
  });

  describe("renderToReadableStream", () => {
    it("returns a ReadableStream and sets statusCode to 200", async () => {
      const renderer = new JSXRenderer(TestComponent);
      const stream = await renderer.renderToReadableStream();
      expect(stream).toBeInstanceOf(ReadableStream);
      expect(renderer.statusCode).toBe(200);
    });

    it("sets statusCode to 500 on shell error", async () => {
      const ErrorComponent: React.FC<
        ServerEntrypointProps<Record<string, unknown>>
      > = () => {
        throw new Error("Shell error");
      };
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const renderer = new JSXRenderer(ErrorComponent);
      const stream = await renderer.renderToReadableStream();
      expect(stream).toBeInstanceOf(ReadableStream);
      expect(renderer.statusCode).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe("renderToPipeableStream", () => {
    it("returns pipe and abort functions", () => {
      const renderer = new JSXRenderer(TestComponent);
      const result = renderer.renderToPipeableStream();
      expect(typeof result.pipe).toBe("function");
      expect(typeof result.abort).toBe("function");
    });

    it("resolves statusReady and sets statusCode to 200", async () => {
      const renderer = new JSXRenderer(TestComponent);
      renderer.renderToPipeableStream();
      await renderer.statusReady;
      expect(renderer.statusCode).toBe(200);
    });

    it("sets statusCode to 500 on shell error", async () => {
      const ErrorComponent: React.FC<
        ServerEntrypointProps<Record<string, unknown>>
      > = () => {
        throw new Error("Shell error");
      };
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const renderer = new JSXRenderer(ErrorComponent);
      renderer.renderToPipeableStream();
      await renderer.statusReady;
      expect(renderer.statusCode).toBe(500);
      consoleSpy.mockRestore();
    });

    it("invokes user-provided onShellReady callback", async () => {
      const onShellReady = vi.fn();
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { renderToPipeableStreamOptions: { onShellReady } },
      );
      renderer.renderToPipeableStream();
      await renderer.statusReady;
      expect(onShellReady).toHaveBeenCalled();
    });

    it("invokes user-provided onAllReady callback", async () => {
      const onAllReady = vi.fn();
      const renderer = new JSXRenderer(
        TestComponent,
        {},
        { renderToPipeableStreamOptions: { onAllReady } },
      );
      renderer.renderToPipeableStream();
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
      expect(onAllReady).toHaveBeenCalled();
    });

    it("invokes user-provided onShellError callback", async () => {
      const ErrorComponent: React.FC<
        ServerEntrypointProps<Record<string, unknown>>
      > = () => {
        throw new Error("Shell error");
      };
      const onShellError = vi.fn();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const renderer = new JSXRenderer(
        ErrorComponent,
        {},
        { renderToPipeableStreamOptions: { onShellError } },
      );
      renderer.renderToPipeableStream();
      await renderer.statusReady;
      expect(onShellError).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("throws when renderToPipeableStream is unavailable in the runtime (e.g. Bun)", async () => {
      // Bun's react-dom/server omits renderToPipeableStream. The module
      // captures it at import time, so mock the export and re-import fresh.
      vi.resetModules();
      vi.doMock("react-dom/server", async (importOriginal) => {
        const actual =
          await importOriginal<typeof import("react-dom/server")>();
        return { ...actual, renderToPipeableStream: undefined };
      });

      const { default: FreshJSXRenderer } = await import("./JSXRenderer.js");
      const renderer = new FreshJSXRenderer(TestComponent);

      expect(() => renderer.renderToPipeableStream()).toThrow(
        /renderToPipeableStream is not available|Bun does not support/,
      );

      vi.doUnmock("react-dom/server");
      vi.resetModules();
    });
  });

  describe("renderToString", () => {
    it("returns an HTML string and sets statusCode to 200", () => {
      const renderer = new JSXRenderer(TestComponent);
      const html = renderer.renderToString();
      expect(typeof html).toBe("string");
      expect(html).toContain("Hello");
      expect(renderer.statusCode).toBe(200);
    });
  });
});
