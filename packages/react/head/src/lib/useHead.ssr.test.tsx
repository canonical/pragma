import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import createHeadCollector from "./createHeadCollector.js";
import HeadProvider from "./HeadProvider.js";
import useHead from "./useHead.js";

function Page() {
  useHead({
    title: "SSR Page",
    meta: [{ name: "description", content: "Server-rendered page" }],
    link: [{ rel: "canonical", href: "https://example.com/page" }],
  });

  return <h1>Page</h1>;
}

function Shell({ children }: { children: React.ReactNode }) {
  useHead({
    title: "App Shell",
    meta: [{ name: "viewport", content: "width=device-width" }],
  });

  return <div>{children}</div>;
}

describe("useHead (SSR)", () => {
  it("collects head tags during server render", () => {
    const collector = createHeadCollector();

    const html = renderToString(
      <HeadProvider collector={collector}>
        <Shell>
          <Page />
        </Shell>
      </HeadProvider>,
    );

    const headHtml = collector.toHtml();

    expect(html).toContain("Page");
    expect(headHtml).toContain("<title>SSR Page</title>");
    expect(headHtml).toContain('name="description"');
    expect(headHtml).toContain('name="viewport"');
    expect(headHtml).toContain('rel="canonical"');
  });

  it("deepest component wins for title", () => {
    const collector = createHeadCollector();

    renderToString(
      <HeadProvider collector={collector}>
        <Shell>
          <Page />
        </Shell>
      </HeadProvider>,
    );

    const headHtml = collector.toHtml();

    expect(headHtml).toContain("<title>SSR Page</title>");
    expect(headHtml).not.toContain("App Shell");
  });
});
