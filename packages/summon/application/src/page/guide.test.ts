import { dryRun, sequence_ } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator as domainGenerator } from "../domain/index.js";
import { generator } from "./index.js";

/** The page the generator writes and the guide it prints, from a dry run. */
function generated(domain: string, name: string) {
  const { effects } = dryRun(
    sequence_([
      domainGenerator.generate({ domainName: domain }),
      generator.generate({ pagePath: `${domain}/${name}` }),
    ]),
  );
  const page = effects.findLast((e) => e._tag === "WriteFile");
  const guide = effects.findLast((e) => e._tag === "Log");
  if (page?._tag !== "WriteFile" || guide?._tag !== "Log") {
    throw new Error("no page written or no guide printed");
  }
  return { page: page.content, guide: guide.message };
}

describe("the printed routing guide", () => {
  it("prints the import, the static and :param examples, and the wiring", () => {
    const { guide } = generated("invoices", "detail");

    expect(
      guide,
    ).toBe(`Created src/domains/invoices/DetailPage.tsx. Nothing else was changed; route the page by hand.

In src/domains/invoices/routes.ts, import the page:
  import DetailPage from "./DetailPage.js";

Then add one entry to its routes object. The urls are examples to adapt.

A static url:
  detail: route({ url: "/invoices/detail", content: DetailPage }),

A url with a :param segment; the page takes the params it declares:
  detail: route({ url: "/invoices/:id", content: DetailPage }),
  // DetailPage.tsx
  import type { RouteContentProps, RouteParams } from "@canonical/router-core";
  export default function DetailPage({
    params,
  }: RouteContentProps<RouteParams<"/invoices/:id">>): ReactElement {

Typed search parameters: add \`search: <a Standard Schema>\` to the route and read \`search\` in the page.

In src/routes.tsx, put the route in a group() and list it in appRoutes:
  import invoicesRoutes from "#domains/invoices/routes.js";
  const [detail] = group(/* your wrapper() */, [invoicesRoutes.detail] as const);
  const appRoutes = { /* …the routes already listed */ detail } as const;`);
  });
});
