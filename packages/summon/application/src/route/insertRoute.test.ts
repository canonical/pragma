import { describe, expect, it } from "vitest";
import { insertRoute, removeRoute } from "./insertRoute.js";

const BASE = `import { route } from "@canonical/router-core";
import MainPage from "./MainPage.js";

const routes = {
  billing: route({
    url: "/billing",
    content: MainPage,
  }),
} as const;

export default routes;
`;

const INS = {
  pageName: "InvoicesPage",
  importPath: "./InvoicesPage.js",
  routeKey: "invoices",
  url: "/billing/invoices",
} as const;

describe("insertRoute", () => {
  it("adds the import and the route entry", () => {
    const out = insertRoute(BASE, INS);
    expect(out).toContain('import InvoicesPage from "./InvoicesPage.js";');
    expect(out).toContain("invoices: route({");
    expect(out).toContain('url: "/billing/invoices",');
    expect(out).toContain("content: InvoicesPage,");
    // existing entry untouched
    expect(out).toContain("billing: route({");
  });

  it("is idempotent — re-inserting the same route is a no-op", () => {
    const once = insertRoute(BASE, INS);
    expect(insertRoute(once, INS)).toBe(once);
  });

  it("throws when there is no routes object literal", () => {
    expect(() => insertRoute("export const x = 1;\n", INS)).toThrow(/routes/);
  });
});

describe("removeRoute", () => {
  it("is the exact inverse of insertRoute (round-trip)", () => {
    const added = insertRoute(BASE, INS);
    expect(removeRoute(added, INS)).toBe(BASE);
  });

  it("is idempotent — removing an absent route is a no-op", () => {
    expect(removeRoute(BASE, INS)).toBe(BASE);
  });

  it("leaves other routes and imports intact", () => {
    const added = insertRoute(BASE, INS);
    const back = removeRoute(added, INS);
    expect(back).toContain("billing: route({");
    expect(back).toContain('import MainPage from "./MainPage.js";');
    expect(back).not.toContain("InvoicesPage");
  });
});
