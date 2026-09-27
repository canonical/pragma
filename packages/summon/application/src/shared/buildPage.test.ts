import { describe, expect, it } from "vitest";
import { buildPage } from "./buildPage.js";

describe("buildPage", () => {
  it("builds the thin page", () => {
    expect(
      buildPage({
        pageName: "DetailPage",
        title: "Detail",
        headingId: "detail-title",
      }),
    ).toBe(`import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function DetailPage(): ReactElement {
  return (
    <section aria-labelledby="detail-title">
      <Head title="Detail" />
      <h1 id="detail-title">Detail</h1>
    </section>
  );
}
`);
  });

  it("places body lines under the heading (the domain's MainPage)", () => {
    expect(
      buildPage({
        pageName: "MainPage",
        title: "Billing",
        headingId: "main-title",
        body: ["<p>This is the main page for the billing domain.</p>"],
      }),
    ).toBe(`import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function MainPage(): ReactElement {
  return (
    <section aria-labelledby="main-title">
      <Head title="Billing" />
      <h1 id="main-title">Billing</h1>
      <p>This is the main page for the billing domain.</p>
    </section>
  );
}
`);
  });
});
