import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generators } from "./index.js";

describe("domain generator", () => {
  it("creates MainPage.tsx and routes.ts in src/domains/{name}/", () => {
    const result = dryRun(
      generators.domain.generate({ domainName: "billing" }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const paths = writeEffects.map((e) => (e as { path: string }).path);

    expect(paths).toContain("src/domains/billing/MainPage.tsx");
    expect(paths).toContain("src/domains/billing/routes.ts");
  });

  it("creates a MakeDir effect for the domain directory", () => {
    const result = dryRun(
      generators.domain.generate({ domainName: "billing" }),
    );

    const mkdirEffects = result.effects.filter((e) => e._tag === "MakeDir");
    const paths = mkdirEffects.map((e) => (e as { path: string }).path);

    expect(paths).toContain("src/domains/billing");
  });
});

describe("route generator", () => {
  it("creates {Name}Page.tsx and appends to routes.ts", () => {
    const result = dryRun(
      generators.route.generate({ routePath: "account/settings" }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const writePaths = writeEffects.map((e) => (e as { path: string }).path);

    expect(writePaths).toContain("src/domains/account/SettingsPage.tsx");

    const appendEffects = result.effects.filter((e) => e._tag === "AppendFile");
    const appendPaths = appendEffects.map((e) => (e as { path: string }).path);

    expect(appendPaths).toContain("src/domains/account/routes.ts");
  });

  it("includes correct content in the page component", () => {
    const result = dryRun(
      generators.route.generate({ routePath: "account/settings" }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const page = writeEffects.find(
      (e) =>
        (e as { path: string }).path === "src/domains/account/SettingsPage.tsx",
    ) as { content: string } | undefined;

    expect(page).toBeDefined();
    expect(page?.content).toContain("export default function SettingsPage()");
    expect(page?.content).toContain('useHead({ title: "Settings" })');
  });

  it("appends import and route comment to routes.ts", () => {
    const result = dryRun(
      generators.route.generate({ routePath: "account/settings" }),
    );

    const appendEffects = result.effects.filter((e) => e._tag === "AppendFile");
    const routesAppend = appendEffects.find(
      (e) => (e as { path: string }).path === "src/domains/account/routes.ts",
    ) as { content: string } | undefined;

    expect(routesAppend).toBeDefined();
    expect(routesAppend?.content).toContain(
      'import SettingsPage from "./SettingsPage.js"',
    );
    expect(routesAppend?.content).toContain(
      'settings: route({ url: "/account/settings", content: SettingsPage })',
    );
  });

  it("throws on single-segment path", () => {
    expect(() =>
      dryRun(generators.route.generate({ routePath: "settings" })),
    ).toThrow();
  });
});

describe("wrapper generator", () => {
  it("creates {Name}Layout.tsx and index.ts in src/lib/{Name}Layout/", () => {
    const result = dryRun(
      generators.wrapper.generate({ wrapperName: "settings" }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const paths = writeEffects.map((e) => (e as { path: string }).path);

    expect(paths).toContain("src/lib/SettingsLayout/SettingsLayout.tsx");
    expect(paths).toContain("src/lib/SettingsLayout/index.ts");
  });

  it("generates correct layout content", () => {
    const result = dryRun(
      generators.wrapper.generate({ wrapperName: "settings" }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const layout = writeEffects.find(
      (e) =>
        (e as { path: string }).path ===
        "src/lib/SettingsLayout/SettingsLayout.tsx",
    ) as { content: string } | undefined;

    expect(layout).toBeDefined();
    expect(layout?.content).toContain(
      "export default function SettingsLayout(",
    );
    expect(layout?.content).toContain('className="settings-layout"');
  });

  it("generates correct barrel export", () => {
    const result = dryRun(
      generators.wrapper.generate({ wrapperName: "settings" }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const barrel = writeEffects.find(
      (e) => (e as { path: string }).path === "src/lib/SettingsLayout/index.ts",
    ) as { content: string } | undefined;

    expect(barrel).toBeDefined();
    expect(barrel?.content).toContain(
      'export { default } from "./SettingsLayout.js"',
    );
  });
});
