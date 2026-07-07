import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createHeadCollector from "./createHeadCollector.js";
import HeadProvider from "./HeadProvider.js";
import useHead from "./useHead.js";

function Title({ value }: { value: string }) {
  useHead({ title: value });

  return <span data-testid="rendered">{value}</span>;
}

function Meta({ name, content }: { name: string; content: string }) {
  useHead({ meta: [{ name, content }] });

  return null;
}

function LinkTag({ rel, href }: { rel: string; href: string }) {
  useHead({ link: [{ rel, href }] });

  return null;
}

describe("useHead (client)", () => {
  it("sets document.title on mount and does not restore on unmount", () => {
    const originalTitle = document.title;

    const { unmount } = render(
      <HeadProvider>
        <Title value="Test Page" />
      </HeadProvider>,
    );

    expect(document.title).toBe("Test Page");

    unmount();

    expect(document.title).toBe("Test Page");
    document.title = originalTitle;
  });

  it("appends meta tags to document.head and removes them on unmount", () => {
    const { unmount } = render(
      <HeadProvider>
        <Meta name="description" content="A test page" />
      </HeadProvider>,
    );

    const meta = document.head.querySelector('meta[name="description"]');

    expect(meta).not.toBeNull();
    expect(meta?.getAttribute("content")).toBe("A test page");

    unmount();

    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });

  it("appends link tags to document.head and removes them on unmount", () => {
    const { unmount } = render(
      <HeadProvider>
        <LinkTag rel="canonical" href="https://example.com" />
      </HeadProvider>,
    );

    const link = document.head.querySelector('link[rel="canonical"]');

    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com");

    unmount();

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("updates existing meta tags instead of duplicating", () => {
    function UpdatingMeta({ content }: { content: string }) {
      useHead({ meta: [{ name: "description", content }] });

      return <span data-testid="content">{content}</span>;
    }

    const { rerender } = render(
      <HeadProvider>
        <UpdatingMeta content="first" />
      </HeadProvider>,
    );

    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("first");

    rerender(
      <HeadProvider>
        <UpdatingMeta content="second" />
      </HeadProvider>,
    );

    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("second");

    const allDescriptionMetas = document.head.querySelectorAll(
      'meta[name="description"]',
    );

    expect(allDescriptionMetas.length).toBe(1);
  });

  it("updates a pre-existing meta element from a sibling component", () => {
    const { unmount } = render(
      <HeadProvider>
        <Meta name="description" content="first sibling" />
        <Meta name="description" content="second sibling" />
      </HeadProvider>,
    );

    const metas = document.head.querySelectorAll('meta[name="description"]');

    expect(metas.length).toBe(1);
    expect(metas[0]?.getAttribute("content")).toBe("second sibling");

    unmount();

    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });

  it("delegates to the collector and removes its entry on unmount", () => {
    const collector = createHeadCollector();

    const { unmount } = render(
      <HeadProvider collector={collector}>
        <Title value="Collected Page" />
      </HeadProvider>,
    );

    expect(collector.toHtml()).toContain("<title>Collected Page</title>");

    unmount();

    expect(collector.toHtml()).toBe("");
  });

  it("appends a property meta tag to document.head", () => {
    function PropertyMeta() {
      useHead({
        meta: [{ property: "og:title", content: "Open Graph Title" }],
      });

      return null;
    }

    const { unmount } = render(
      <HeadProvider>
        <PropertyMeta />
      </HeadProvider>,
    );

    const meta = document.head.querySelector('meta[property="og:title"]');

    expect(meta?.getAttribute("content")).toBe("Open Graph Title");

    unmount();

    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
  });

  it("appends an http-equiv meta tag to document.head", () => {
    function HttpEquivMeta() {
      useHead({
        meta: [{ httpEquiv: "content-type", content: "text/html" }],
      });

      return null;
    }

    const { unmount } = render(
      <HeadProvider>
        <HttpEquivMeta />
      </HeadProvider>,
    );

    const meta = document.head.querySelector('meta[http-equiv="content-type"]');

    expect(meta?.getAttribute("content")).toBe("text/html");

    unmount();

    expect(
      document.head.querySelector('meta[http-equiv="content-type"]'),
    ).toBeNull();
  });

  it("appends a content-only meta tag to document.head", () => {
    function ContentMeta() {
      useHead({ meta: [{ content: "no-referrer" }] });

      return null;
    }

    const { unmount } = render(
      <HeadProvider>
        <ContentMeta />
      </HeadProvider>,
    );

    const meta = document.head.querySelector('meta[content="no-referrer"]');

    expect(meta).not.toBeNull();

    unmount();

    expect(
      document.head.querySelector('meta[content="no-referrer"]'),
    ).toBeNull();
  });

  it("appends a fully-attributed link tag to document.head", () => {
    function FullLink() {
      useHead({
        link: [
          {
            rel: "preload",
            href: "/font.woff2",
            type: "font/woff2",
            sizes: "any",
            media: "screen",
            crossOrigin: "anonymous",
          },
        ],
      });

      return null;
    }

    const { unmount } = render(
      <HeadProvider>
        <FullLink />
      </HeadProvider>,
    );

    const link = document.head.querySelector('link[rel="preload"]');

    expect(link?.getAttribute("href")).toBe("/font.woff2");
    expect(link?.getAttribute("type")).toBe("font/woff2");
    expect(link?.getAttribute("sizes")).toBe("any");
    expect(link?.getAttribute("media")).toBe("screen");
    expect(link?.getAttribute("crossorigin")).toBe("anonymous");

    unmount();

    expect(document.head.querySelector('link[rel="preload"]')).toBeNull();
  });

  it("re-runs the effect when a provided dep changes", () => {
    function DepMeta({ content }: { content: string }) {
      useHead({ meta: [{ name: "keywords", content }] }, [content]);

      return null;
    }

    const { rerender } = render(
      <HeadProvider>
        <DepMeta content="first" />
      </HeadProvider>,
    );

    expect(
      document.head
        .querySelector('meta[name="keywords"]')
        ?.getAttribute("content"),
    ).toBe("first");

    rerender(
      <HeadProvider>
        <DepMeta content="second" />
      </HeadProvider>,
    );

    expect(
      document.head
        .querySelector('meta[name="keywords"]')
        ?.getAttribute("content"),
    ).toBe("second");
  });

  it("allows multiple components to contribute head tags", () => {
    const { unmount } = render(
      <HeadProvider>
        <Title value="Multi Page" />
        <Meta name="author" content="Test Author" />
        <LinkTag rel="icon" href="/favicon.ico" />
      </HeadProvider>,
    );

    expect(document.title).toBe("Multi Page");
    expect(
      document.head
        .querySelector('meta[name="author"]')
        ?.getAttribute("content"),
    ).toBe("Test Author");
    expect(
      document.head.querySelector('link[rel="icon"]')?.getAttribute("href"),
    ).toBe("/favicon.ico");

    unmount();
  });
});
