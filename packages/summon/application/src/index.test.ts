import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generators } from "./index.js";

describe("application/react generator", () => {
  it("creates the expected files for a React application", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
      }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const paths = writeEffects.map((e) => (e as { path: string }).path);

    expect(paths).toContain("my-app/package.json");
    expect(paths).toContain("my-app/tsconfig.json");
    expect(paths).toContain("my-app/vite.config.ts");
    expect(paths).toContain("my-app/biome.json");
    expect(paths).toContain("my-app/index.html");
    expect(paths).toContain("my-app/src/styles/index.css");
    expect(paths).toContain("my-app/src/styles/app.css");
    expect(paths).toContain("my-app/src/client/entry.tsx");
    expect(paths).toContain("my-app/src/server/entry.tsx");
    expect(paths).toContain("my-app/src/server/server.express.ts");
    expect(paths).toContain("my-app/src/server/server.bun.ts");
    expect(paths).toContain("my-app/src/server/sitemap.ts");
    expect(paths).toContain("my-app/src/domains/marketing/HomePage.tsx");
    expect(paths).toContain("my-app/src/domains/marketing/routes.ts");
    expect(paths).toContain("my-app/src/routes.tsx");
    expect(paths).toContain("my-app/src/lib/Navigation/Navigation.tsx");
    expect(paths).toContain("my-app/src/lib/Navigation/index.ts");
    expect(paths).toContain("my-app/src/lib/index.ts");
  });

  it("reads EJS templates for each generated file", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
      }),
    );

    const readEffects = result.effects.filter((e) => e._tag === "ReadFile");
    const paths = readEffects.map((e) => (e as { path: string }).path);

    // Each template() call reads a .ejs source file
    expect(paths.some((p) => p.endsWith("package.json.ejs"))).toBe(true);
    expect(paths.some((p) => p.endsWith("vite.config.ts.ejs"))).toBe(true);
    expect(paths.some((p) => p.endsWith("entry.tsx.ejs"))).toBe(true);
  });

  it("creates MakeDir effects for parent directories", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
      }),
    );

    const mkdirEffects = result.effects.filter((e) => e._tag === "MakeDir");
    const paths = mkdirEffects.map((e) => (e as { path: string }).path);

    // template() auto-creates parent directories for each destination
    expect(paths).toContain("my-app");
    expect(paths).toContain("my-app/src/client");
    expect(paths).toContain("my-app/src/server");
    expect(paths).toContain("my-app/src/styles");
    expect(paths).toContain("my-app/src/domains/marketing");
    expect(paths).toContain("my-app/src/lib/Navigation");
    expect(paths).toContain("my-app/src/lib");
    expect(paths).toContain("my-app/src");
  });

  it("throws when --ssr is false", () => {
    expect(() =>
      dryRun(
        generators["application/react"].generate({
          appPath: "my-app",
          ssr: false,
          router: true,
        }),
      ),
    ).toThrow();
  });

  it("throws when --router is false", () => {
    expect(() =>
      dryRun(
        generators["application/react"].generate({
          appPath: "my-app",
          ssr: true,
          router: false,
        }),
      ),
    ).toThrow();
  });

  it("uses the appPath in generated file paths", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "custom-app",
        ssr: true,
        router: true,
      }),
    );

    const writeEffects = result.effects.filter((e) => e._tag === "WriteFile");
    const paths = writeEffects.map((e) => (e as { path: string }).path);

    expect(paths).toContain("custom-app/package.json");
    expect(paths).toContain("custom-app/src/client/entry.tsx");
  });
});

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
