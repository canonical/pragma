import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generators } from "./index.js";

describe("application/react generator", () => {
  it("produces effects for all expected files", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: false,
        runInstall: false,
      }),
    );

    // template() produces WriteFile, copyFile() produces CopyFile
    const filePaths = result.effects
      .filter((e) => e._tag === "WriteFile" || e._tag === "CopyFile")
      .map(
        (e) =>
          (e as { path?: string; dest?: string }).path ??
          (e as { dest?: string }).dest,
      );

    // EJS templates (interpolated)
    expect(filePaths).toContain("my-app/package.json");
    expect(filePaths).toContain("my-app/README.md");

    // Static copies
    expect(filePaths).toContain("my-app/tsconfig.json");
    expect(filePaths).toContain("my-app/vite.config.ts");
    expect(filePaths).toContain("my-app/biome.json");
    expect(filePaths).toContain("my-app/index.html");
    expect(filePaths).toContain("my-app/.gitignore");
    expect(filePaths).toContain("my-app/src/client/entry.tsx");
    expect(filePaths).toContain("my-app/src/server/entry.tsx");
    expect(filePaths).toContain("my-app/src/server/server.express.ts");
    expect(filePaths).toContain("my-app/src/server/server.bun.ts");
    expect(filePaths).toContain("my-app/src/server/sitemap.ts");
    expect(filePaths).toContain("my-app/src/domains/marketing/HomePage.tsx");
    expect(filePaths).toContain("my-app/src/domains/marketing/routes.ts");
    expect(filePaths).toContain("my-app/src/routes.tsx");
    expect(filePaths).toContain("my-app/src/lib/Navigation/Navigation.tsx");
    expect(filePaths).toContain("my-app/src/lib/Navigation/index.ts");
    expect(filePaths).toContain("my-app/src/lib/index.ts");
    expect(filePaths).toContain("my-app/src/vite-env.d.ts");
    expect(filePaths).toContain("my-app/src/styles/index.css");
    expect(filePaths).toContain("my-app/src/styles/app.css");
    expect(filePaths).toContain("my-app/.storybook/main.ts");
    expect(filePaths).toContain("my-app/.storybook/preview.ts");
    expect(filePaths).toContain("my-app/.storybook/decorators/withRouter.tsx");
    expect(filePaths).toContain("my-app/.storybook/decorators/index.ts");
  });

  it("uses the appPath in file paths", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "custom-app",
        ssr: true,
        router: true,
        forms: false,
        runInstall: false,
      }),
    );

    const filePaths = result.effects
      .filter((e) => e._tag === "WriteFile" || e._tag === "CopyFile")
      .map(
        (e) =>
          (e as { path?: string; dest?: string }).path ??
          (e as { dest?: string }).dest,
      );

    expect(filePaths).toContain("custom-app/package.json");
    expect(filePaths).toContain("custom-app/src/client/entry.tsx");
  });

  it("throws when --ssr is false", () => {
    expect(() =>
      dryRun(
        generators["application/react"].generate({
          appPath: "my-app",
          ssr: false,
          router: true,
          forms: false,
          runInstall: false,
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
          forms: false,
          runInstall: false,
        }),
      ),
    ).toThrow();
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
