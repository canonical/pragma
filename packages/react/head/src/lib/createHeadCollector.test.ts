import { describe, expect, it } from "vitest";
import createHeadCollector from "./createHeadCollector.js";

describe("createHeadCollector", () => {
  it("collects and serializes a title", () => {
    const collector = createHeadCollector();

    collector.add("page", { title: "Hello World" });

    expect(collector.toHtml()).toBe("<title>Hello World</title>");
  });

  it("last writer wins for title", () => {
    const collector = createHeadCollector();

    collector.add("shell", { title: "App Name" });
    collector.add("page", { title: "Page Title" });

    expect(collector.toHtml()).toContain("<title>Page Title</title>");
    expect(collector.toHtml()).not.toContain("App Name");
  });

  it("collects meta tags and deduplicates by name", () => {
    const collector = createHeadCollector();

    collector.add("shell", {
      meta: [{ name: "description", content: "Shell description" }],
    });
    collector.add("page", {
      meta: [{ name: "description", content: "Page description" }],
    });

    const html = collector.toHtml();

    expect(html).toContain('content="Page description"');
    expect(html).not.toContain("Shell description");
  });

  it("collects meta tags and deduplicates by property", () => {
    const collector = createHeadCollector();

    collector.add("shell", {
      meta: [{ property: "og:title", content: "Shell" }],
    });
    collector.add("page", {
      meta: [{ property: "og:title", content: "Page" }],
    });

    const html = collector.toHtml();

    expect(html).toContain('content="Page"');
    expect(html).not.toContain('content="Shell"');
  });

  it("accumulates link tags", () => {
    const collector = createHeadCollector();

    collector.add("shell", {
      link: [{ rel: "icon", href: "/favicon.ico" }],
    });
    collector.add("page", {
      link: [{ rel: "canonical", href: "https://example.com" }],
    });

    const html = collector.toHtml();

    expect(html).toContain('rel="icon"');
    expect(html).toContain('rel="canonical"');
  });

  it("removes entries and updates output", () => {
    const collector = createHeadCollector();

    collector.add("shell", { title: "App" });
    collector.add("page", { title: "Page" });
    collector.remove("page");

    expect(collector.toHtml()).toBe("<title>App</title>");
  });

  it("escapes HTML in output", () => {
    const collector = createHeadCollector();

    collector.add("page", { title: '<script>alert("xss")</script>' });

    expect(collector.toHtml()).toBe(
      "<title>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</title>",
    );
  });

  it("collects meta tags and deduplicates by http-equiv", () => {
    const collector = createHeadCollector();

    collector.add("shell", {
      meta: [{ httpEquiv: "content-type", content: "text/html" }],
    });
    collector.add("page", {
      meta: [
        { httpEquiv: "content-type", content: "text/html; charset=utf-8" },
      ],
    });

    const html = collector.toHtml();

    expect(html).toContain('http-equiv="content-type"');
    expect(html).toContain('content="text/html; charset=utf-8"');
    expect(html).not.toContain('content="text/html"');
  });

  it("serializes a content-only meta tag", () => {
    const collector = createHeadCollector();

    collector.add("page", {
      meta: [{ content: "no-referrer" }],
    });

    const html = collector.toHtml();

    expect(html).toBe('<meta content="no-referrer" />');
  });

  it("deduplicates content-only meta tags by content", () => {
    const collector = createHeadCollector();

    collector.add("shell", { meta: [{ content: "shell-only" }] });
    collector.add("page", { meta: [{ content: "page-only" }] });

    const html = collector.toHtml();

    expect(html).toContain('<meta content="shell-only" />');
    expect(html).toContain('<meta content="page-only" />');
  });

  it("serializes a link with sizes", () => {
    const collector = createHeadCollector();

    collector.add("page", {
      link: [{ rel: "icon", href: "/icon.png", sizes: "32x32" }],
    });

    const html = collector.toHtml();

    expect(html).toContain('rel="icon"');
    expect(html).toContain('sizes="32x32"');
  });

  it("serializes a link with crossorigin", () => {
    const collector = createHeadCollector();

    collector.add("page", {
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.example.com",
          crossOrigin: "anonymous",
        },
      ],
    });

    const html = collector.toHtml();

    expect(html).toContain('rel="preconnect"');
    expect(html).toContain('href="https://fonts.example.com"');
    expect(html).toContain('crossorigin="anonymous"');
  });

  it("renders all tag types together", () => {
    const collector = createHeadCollector();

    collector.add("page", {
      title: "Full Page",
      meta: [
        { name: "description", content: "A page" },
        { property: "og:image", content: "https://example.com/img.png" },
      ],
      link: [
        { rel: "canonical", href: "https://example.com" },
        {
          rel: "stylesheet",
          href: "/styles.css",
          type: "text/css",
          media: "screen",
        },
      ],
    });

    const html = collector.toHtml();

    expect(html).toContain("<title>Full Page</title>");
    expect(html).toContain('name="description"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('type="text/css"');
    expect(html).toContain('media="screen"');
  });
});
