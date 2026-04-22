import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
