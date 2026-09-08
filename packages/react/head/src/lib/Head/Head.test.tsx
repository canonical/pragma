import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import HeadProvider from "../HeadProvider/Provider.js";
import Head from "./Head.js";

/** The title template a page's own title is composed through. */
function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} — Ubuntu`;
}

describe("Head (client)", () => {
  it("sets the document title and removes it on unmount", () => {
    const { unmount } = render(<Head title="Test Page" />);

    expect(document.title).toBe("Test Page");

    unmount();

    expect(document.head.querySelector("title")).toBeNull();
  });

  it("composes the title with the provider's template", () => {
    render(
      <HeadProvider titleTemplate={formatDocumentTitle}>
        <Head title="Profile" />
      </HeadProvider>,
    );

    expect(document.title).toBe("Profile — Ubuntu");
  });

  it("updates the title in place when it changes", () => {
    const { rerender } = render(<Head title="First" />);

    expect(document.title).toBe("First");

    rerender(<Head title="Second" />);

    expect(document.title).toBe("Second");
    expect(document.head.querySelectorAll("title").length).toBe(1);
  });

  it("renders nothing when no tags are declared", () => {
    const { container } = render(<Head />);

    expect(container.innerHTML).toBe("");
    expect(document.head.querySelector("title")).toBeNull();
  });

  it("renders every meta tag it is given, whatever names it", () => {
    const { unmount } = render(
      <Head
        meta={[
          { name: "description", content: "A test page" },
          { property: "og:title", content: "Open Graph Title" },
          { httpEquiv: "content-security-policy", content: "default-src" },
          { charSet: "utf-8" },
        ]}
      />,
    );

    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("A test page");
    expect(
      document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
    ).toBe("Open Graph Title");
    expect(
      document.head
        .querySelector('meta[http-equiv="content-security-policy"]')
        ?.getAttribute("content"),
    ).toBe("default-src");
    expect(document.head.querySelector("meta[charset]")).not.toBeNull();

    unmount();

    expect(document.head.querySelectorAll("meta").length).toBe(0);
  });

  it("keys repeated tags apart when they differ only in content", () => {
    // React only complains about duplicate keys; it still renders both tags.
    // So the console is the gate: a key built from the naming attribute alone
    // would collide here, and every assertion below would still pass.
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Head
        meta={[
          { property: "og:image", content: "/one.png" },
          { property: "og:image", content: "/two.png" },
        ]}
      />,
    );

    expect(warn).not.toHaveBeenCalled();
    expect(
      Array.from(
        document.head.querySelectorAll('meta[property="og:image"]'),
        (element) => element.getAttribute("content"),
      ),
    ).toEqual(["/one.png", "/two.png"]);

    warn.mockRestore();
  });

  it("keeps a tag stable across renders when it carries a ref", () => {
    // A ref is a handle, not an attribute: it holds null until the element
    // mounts and the element itself afterwards. Keying on it would rekey the
    // tag on the render after mount — and serializing a mounted DOM node
    // throws on its circular structure, so this used to be a crash, not a
    // churn.
    function Probe({ label }: { label: string }) {
      const ref = useRef<HTMLMetaElement>(null);

      return (
        <>
          <Head meta={[{ name: "description", content: "A page", ref }]} />
          <span data-testid="label">{label}</span>
        </>
      );
    }

    const { rerender } = render(<Probe label="first" />);
    const mounted = document.head.querySelector('meta[name="description"]');

    expect(mounted).not.toBeNull();

    rerender(<Probe label="second" />);

    expect(document.head.querySelector('meta[name="description"]')).toBe(
      mounted,
    );
  });

  it("renders a fully attributed link tag and removes it on unmount", () => {
    const { unmount } = render(
      <Head
        link={[
          {
            rel: "preload",
            href: "/font.woff2",
            as: "font",
            type: "font/woff2",
            crossOrigin: "anonymous",
            fetchPriority: "high",
          },
        ]}
      />,
    );

    const link = document.head.querySelector('link[rel="preload"]');

    expect(link?.getAttribute("href")).toBe("/font.woff2");
    expect(link?.getAttribute("as")).toBe("font");
    expect(link?.getAttribute("type")).toBe("font/woff2");
    expect(link?.getAttribute("crossorigin")).toBe("anonymous");

    unmount();

    expect(document.head.querySelector('link[rel="preload"]')).toBeNull();
  });
});
