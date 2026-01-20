import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Breadcrumbs from "./Breadcrumbs.js";

describe("Breadcrumbs SSR", () => {
  it("renders without errors on server", () => {
    const html = renderToString(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/products">Products</Breadcrumbs.Item>
        <Breadcrumbs.Item current>Current</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(html).toContain("Home");
    expect(html).toContain("Products");
    expect(html).toContain("Current");
    expect(html).toContain('class="ds breadcrumbs"');
  });

  it("renders nav with aria-label on server", () => {
    const html = renderToString(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it("renders current item with aria-current on server", () => {
    const html = renderToString(
      <Breadcrumbs>
        <Breadcrumbs.Item current>Current</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(html).toContain('aria-current="page"');
  });
});
