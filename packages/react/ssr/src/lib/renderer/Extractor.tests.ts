import { describe, expect, it } from "vitest";
import Extractor from "./Extractor.js";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Page</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="/favicon.ico">
  <style>.foo { color: red; }</style>
  <meta name="description" content="A test page">
  <base href="/">
  <script type="module" src="/main.js"></script>
  <script src="/legacy.js" crossorigin="anonymous"></script>
</head>
<body><div id="root"></div></body>
</html>`;

describe("Extractor", () => {
  describe("constructor", () => {
    it("parses an HTML string without throwing", () => {
      expect(() => new Extractor(SAMPLE_HTML)).not.toThrow();
    });

    it("handles an empty HTML string", () => {
      const extractor = new Extractor("");
      expect(extractor.getLinkElements()).toEqual([]);
      expect(extractor.getScriptElements()).toEqual([]);
      expect(extractor.getOtherHeadElements()).toEqual([]);
    });
  });

  describe("getLinkElements", () => {
    it("extracts all link elements in DOM order", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const links = extractor.getLinkElements();
      expect(links).toHaveLength(2);
      expect(links[0].props.rel).toBe("stylesheet");
      expect(links[0].props.href).toBe("/style.css");
      expect(links[1].props.rel).toBe("icon");
      expect(links[1].props.href).toBe("/favicon.ico");
    });
  });

  describe("getScriptElements", () => {
    it("extracts all script elements in DOM order", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const scripts = extractor.getScriptElements();
      expect(scripts).toHaveLength(2);
      expect(scripts[0].props.type).toBe("module");
      expect(scripts[0].props.src).toBe("/main.js");
      expect(scripts[1].props.src).toBe("/legacy.js");
    });

    it("does not produce duplicate script elements", () => {
      // htmlparser2 may report script elements with type "script" rather than "tag"
      const html = "<html><head><script src='/a.js'></script></head></html>";
      const extractor = new Extractor(html);
      const scripts = extractor.getScriptElements();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].props.src).toBe("/a.js");
    });
  });

  describe("getOtherHeadElements", () => {
    it("extracts title, style, meta, and base elements in DOM order", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const others = extractor.getOtherHeadElements();
      // Order in sample HTML: meta(charset), title, style, meta(description), base
      expect(others).toHaveLength(5);
      expect(others[0].type).toBe("meta");
      expect(others[0].props.charSet).toBe("utf-8");
      expect(others[1].type).toBe("title");
      expect(others[2].type).toBe("style");
      expect(others[3].type).toBe("meta");
      expect(others[3].props.name).toBe("description");
      expect(others[4].type).toBe("base");
    });

    it("preserves inter-type DOM order (not grouped by tag type)", () => {
      const html = `<html><head>
        <title>First</title>
        <meta name="a" content="1">
        <style>body{}</style>
        <meta name="b" content="2">
      </head></html>`;
      const extractor = new Extractor(html);
      const others = extractor.getOtherHeadElements();
      expect(others[0].type).toBe("title");
      expect(others[1].type).toBe("meta");
      expect(others[1].props.name).toBe("a");
      expect(others[2].type).toBe("style");
      expect(others[3].type).toBe("meta");
      expect(others[3].props.name).toBe("b");
    });
  });

  describe("convertKeyToReactKey", () => {
    it("maps class to className", () => {
      const html = '<html><head><meta class="foo"></head></html>';
      const extractor = new Extractor(html);
      const elements = extractor.getOtherHeadElements();
      expect(elements[0].props.className).toBe("foo");
    });

    it("maps for to htmlFor", () => {
      const html = '<html><head><meta for="bar"></head></html>';
      const extractor = new Extractor(html);
      const elements = extractor.getOtherHeadElements();
      expect(elements[0].props.htmlFor).toBe("bar");
    });

    it("maps crossorigin to crossOrigin", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const scripts = extractor.getScriptElements();
      expect(scripts[1].props.crossOrigin).toBe("anonymous");
    });

    it("maps charset to charSet", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const others = extractor.getOtherHeadElements();
      expect(others[0].props.charSet).toBe("utf-8");
    });

    it("converts data-* attributes to camelCase", () => {
      const html = '<html><head><meta data-test-value="123"></head></html>';
      const extractor = new Extractor(html);
      const elements = extractor.getOtherHeadElements();
      expect(elements[0].props.dataTestValue).toBe("123");
    });
  });

  describe("convertToReactElement", () => {
    it("extracts text children from elements like title", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const others = extractor.getOtherHeadElements();
      const title = others.find((el) => el.type === "title");
      expect(title?.props.children).toBe("Test Page");
    });

    it("extracts text children from style elements", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const others = extractor.getOtherHeadElements();
      const style = others.find((el) => el.type === "style");
      expect(style?.props.children).toBe(".foo { color: red; }");
    });

    it("concatenates multiple text chunks (e.g. from HTML entities)", () => {
      const html = "<html><head><title>Hello &amp; World</title></head></html>";
      const extractor = new Extractor(html);
      const others = extractor.getOtherHeadElements();
      const title = others.find((el) => el.type === "title");
      expect(title?.props.children).toBe("Hello & World");
    });

    it("does not extract children when element is self-closing", () => {
      const html = '<html><head><base href="/"></head></html>';
      const extractor = new Extractor(html);
      const others = extractor.getOtherHeadElements();
      expect(others[0].props.children).toBeUndefined();
    });

    it("does not extract children when element has no children", () => {
      const html = '<html><head><meta name="empty"></head></html>';
      const extractor = new Extractor(html);
      const others = extractor.getOtherHeadElements();
      expect(others[0].props.children).toBeUndefined();
    });

    it("assigns a unique key to each element", () => {
      const extractor = new Extractor(SAMPLE_HTML);
      const links = extractor.getLinkElements();
      expect(links[0].key).toBe("link_0");
      expect(links[1].key).toBe("link_1");
    });
  });
});
