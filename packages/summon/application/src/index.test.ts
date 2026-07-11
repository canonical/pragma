import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dryRun, sequence_ } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generators } from "./index.js";

/**
 * The route generator requires an existing domain (it adds to one). In a
 * dry-run the virtual filesystem is empty, so we first run the domain generator
 * in the same sequence to "create" src/domains/<domain>/routes.ts, then add the
 * route — mirroring real usage (`summon domain` then `summon route`).
 */
function dryRunRoute(domain: string, route: string) {
  return dryRun(
    sequence_([
      generators.domain.generate({ domainName: domain }),
      generators.route.generate({ routePath: `${domain}/${route}` }),
    ]),
  );
}

describe("application/react generator", () => {
  it("produces effects for all expected files", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: false,
        relay: false,
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
    expect(filePaths).toContain("my-app/.browserslistrc");
    expect(filePaths).toContain("my-app/src/client/entry.tsx");
    expect(filePaths).toContain("my-app/src/server/entry.tsx");
    expect(filePaths).toContain("my-app/src/server/renderer.tsx");
    expect(filePaths).toContain("my-app/src/server/server.express.ts");
    expect(filePaths).toContain("my-app/src/server/server.bun.ts");
    expect(filePaths).toContain("my-app/src/server/preview.express.ts");
    expect(filePaths).toContain("my-app/src/server/preview.bun.ts");
    expect(filePaths).toContain("my-app/public/robots.txt");
    expect(filePaths).toContain("my-app/src/sitemap/renderer.ts");
    expect(filePaths).toContain("my-app/src/sitemap/getSitemapItems.ts");
    expect(filePaths).toContain("my-app/vitest.e2e.config.ts");
    expect(filePaths).toContain("my-app/test/e2e/serverHarness.ts");
    expect(filePaths).toContain("my-app/test/e2e/servers.e2e.ts");
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

    // Account domain
    expect(filePaths).toContain("my-app/src/domains/account/AccountPage.tsx");
    expect(filePaths).toContain("my-app/src/domains/account/LoginPage.tsx");
    expect(filePaths).toContain("my-app/src/domains/account/routes.ts");

    // Contact domain NOT included when forms=false
    expect(filePaths).not.toContain(
      "my-app/src/domains/contact/ContactPage.tsx",
    );
    expect(filePaths).not.toContain("my-app/src/domains/contact/routes.ts");
  });

  it("scaffolds every file present in the templates directory", () => {
    // Authoritative manifest-completeness guard: enumerate the templates dir on
    // disk and assert each file is emitted by the generator. The manifest is a
    // hand-maintained allow-list, so a new template file added without a matching
    // copy()/template() entry would silently never reach generated apps — this
    // test fails loudly when that happens.
    const templatesDir = fileURLToPath(
      new URL("./application/react/templates", import.meta.url),
    );
    const onDisk = readdirSync(templatesDir, { recursive: true })
      .map((entry) => String(entry).split(path.sep).join("/"))
      .filter((rel) => statSync(path.join(templatesDir, rel)).isFile())
      // `.ejs` templates are emitted at the interpolated dest (suffix stripped).
      .map((rel) => (rel.endsWith(".ejs") ? rel.slice(0, -".ejs".length) : rel))
      // The dotless `gitignore` template is emitted as `.gitignore` (npm strips
      // a literal `.gitignore` from tarballs, so it ships dotless — see the
      // generator). Map it back to its emitted dest for this check.
      .map((rel) => (rel === "gitignore" ? ".gitignore" : rel));

    // Generate with all features on so conditionally-included templates emit.
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: true,
        relay: true,
        runInstall: false,
      }),
    );
    const emitted = new Set(
      result.effects
        .filter((e) => e._tag === "WriteFile" || e._tag === "CopyFile")
        .map(
          (e) =>
            (e as { path?: string; dest?: string }).path ??
            (e as { dest?: string }).dest,
        ),
    );

    const missing = onDisk.filter((rel) => !emitted.has(`my-app/${rel}`));
    expect(
      missing,
      `templates not wired into the manifest: ${missing}`,
    ).toEqual([]);
  });

  it("includes contact domain when forms=true", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: true,
        relay: false,
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

    expect(filePaths).toContain("my-app/src/domains/contact/ContactPage.tsx");
    expect(filePaths).toContain("my-app/src/domains/contact/routes.ts");

    // routes.tsx is generated as an EJS template (WriteFile effect exists)
    // Note: readFile is mocked in dry-run so we can't inspect rendered content,
    // but we verify the template is wired up and the contact files are generated.
    const routesEffect = result.effects.find(
      (e) =>
        e._tag === "WriteFile" &&
        (e as { path: string }).path === "my-app/src/routes.tsx",
    );
    expect(routesEffect).toBeDefined();
  });

  it("excludes contact domain files when forms=false", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: false,
        relay: false,
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

    expect(filePaths).not.toContain(
      "my-app/src/domains/contact/ContactPage.tsx",
    );
    expect(filePaths).not.toContain("my-app/src/domains/contact/routes.ts");
  });

  it("includes the relay layer, catalog domain, and patches when relay=true", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: false,
        relay: true,
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

    // Relay layer: compiler config, environment factory, executable mock
    // schema, and the committed compiler artifacts.
    expect(filePaths).toContain("my-app/relay.config.json");
    expect(filePaths).toContain("my-app/src/relay/schema.graphql");
    expect(filePaths).toContain("my-app/src/relay/schema.ts");
    expect(filePaths).toContain("my-app/src/relay/schema.tests.ts");
    expect(filePaths).toContain("my-app/src/relay/environment.ts");
    expect(filePaths).toContain("my-app/src/relay/environment.tests.ts");
    expect(filePaths).toContain(
      "my-app/src/relay/__generated__/ProductCard_product.graphql.ts",
    );
    expect(filePaths).toContain(
      "my-app/src/relay/__generated__/ProductListQuery.graphql.ts",
    );

    // Catalog example domain
    expect(filePaths).toContain("my-app/src/domains/catalog/CatalogPage.tsx");
    expect(filePaths).toContain("my-app/src/domains/catalog/ProductList.tsx");
    expect(filePaths).toContain(
      "my-app/src/domains/catalog/ProductList.stories.tsx",
    );
    expect(filePaths).toContain(
      "my-app/src/domains/catalog/ProductList.tests.tsx",
    );
    expect(filePaths).toContain("my-app/src/domains/catalog/ProductCard.tsx");
    expect(filePaths).toContain("my-app/src/domains/catalog/ErrorBoundary.tsx");
    expect(filePaths).toContain(
      "my-app/src/domains/catalog/ErrorBoundary.tests.tsx",
    );
    expect(filePaths).toContain("my-app/src/domains/catalog/routes.ts");

    // ClientOnly SSR guard (relay is its only consumer today)
    expect(filePaths).toContain("my-app/src/lib/ClientOnly/ClientOnly.tsx");
    expect(filePaths).toContain(
      "my-app/src/lib/ClientOnly/ClientOnly.tests.tsx",
    );
    expect(filePaths).toContain("my-app/src/lib/ClientOnly/index.ts");

    // Standalone dependency patches applied via patchedDependencies
    expect(filePaths).toContain("my-app/patches/react-relay@18.2.0.patch");
    expect(filePaths).toContain(
      "my-app/patches/relay-runtime-network@0.1.0.patch",
    );
  });

  it("excludes the relay layer, catalog domain, and patches when relay=false", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "my-app",
        ssr: true,
        router: true,
        forms: true,
        relay: false,
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

    // No src/relay/, no catalog domain, no ClientOnly, no patches.
    expect(filePaths.filter((p) => p?.startsWith("my-app/src/relay/"))).toEqual(
      [],
    );
    expect(
      filePaths.filter((p) => p?.startsWith("my-app/src/domains/catalog/")),
    ).toEqual([]);
    expect(
      filePaths.filter((p) => p?.startsWith("my-app/src/lib/ClientOnly/")),
    ).toEqual([]);
    expect(filePaths.filter((p) => p?.startsWith("my-app/patches/"))).toEqual(
      [],
    );
    expect(filePaths).not.toContain("my-app/relay.config.json");
  });

  it("uses the appPath in file paths", () => {
    const result = dryRun(
      generators["application/react"].generate({
        appPath: "custom-app",
        ssr: true,
        router: true,
        forms: false,
        relay: false,
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
          relay: false,
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
          relay: false,
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
  it("creates {Name}Page.tsx and transforms routes.ts", () => {
    const result = dryRunRoute("account", "settings");

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);
    expect(writePaths).toContain("src/domains/account/SettingsPage.tsx");

    // The route is wired into routes.ts via a TransformFile (AST insert), not
    // an AppendFile of a TODO comment. The transform content is covered by
    // insertRoute.test.ts.
    const transformPaths = result.effects
      .filter((e) => e._tag === "TransformFile")
      .map((e) => (e as { path: string }).path);
    expect(transformPaths).toContain("src/domains/account/routes.ts");
  });

  it("includes correct content in the page component", () => {
    const result = dryRunRoute("account", "settings");

    const page = result.effects.find(
      (e) =>
        e._tag === "WriteFile" &&
        (e as { path: string }).path === "src/domains/account/SettingsPage.tsx",
    ) as { content: string } | undefined;

    expect(page).toBeDefined();
    expect(page?.content).toContain("export default function SettingsPage()");
    expect(page?.content).toContain('useHead({ title: "Settings" })');
  });

  it("wires the route via a reversible TransformFile (no TODO append)", () => {
    const result = dryRunRoute("account", "settings");

    // No AppendFile TODO stub any more.
    expect(result.effects.some((e) => e._tag === "AppendFile")).toBe(false);

    const transform = result.effects.find(
      (e) =>
        e._tag === "TransformFile" &&
        (e as { path: string }).path === "src/domains/account/routes.ts",
    ) as { transform: (s: string) => string; undo?: unknown } | undefined;

    expect(transform).toBeDefined();
    // It carries an undo (the inverse removeRoute transform).
    expect(transform?.undo).toBeDefined();

    // The forward transform actually inserts the import + route entry.
    const base = `import { route } from "@canonical/router-core";
import MainPage from "./MainPage.js";

const routes = {
  account: route({ url: "/account", content: MainPage }),
} as const;

export default routes;
`;
    const out = transform?.transform(base) ?? "";
    expect(out).toContain('import SettingsPage from "./SettingsPage.js";');
    expect(out).toContain("settings: route({");
    expect(out).toContain('url: "/account/settings",');
    expect(out).toContain("content: SettingsPage,");
  });

  it("throws on single-segment path", () => {
    expect(() =>
      dryRun(generators.route.generate({ routePath: "settings" })),
    ).toThrow();
  });

  it("fails when the target domain does not exist", () => {
    // No domain created first → the guard rejects before writing anything.
    expect(() =>
      dryRun(generators.route.generate({ routePath: "missing/page" })),
    ).toThrow(/not found|Create it first/);
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
