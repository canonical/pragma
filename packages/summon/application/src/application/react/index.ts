import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { template, withHelpers } from "@canonical/summon-core";
import {
  copyFile,
  exec,
  exists,
  flatMap,
  info,
  pure,
  sequence_,
  warn,
  when,
} from "@canonical/task";
import { pickPackageManager } from "../../shared/packageManager.js";
import { resolvePragmaVersion } from "../../shared/versions.js";

export interface ApplicationReactAnswers {
  readonly appPath: string;
  readonly ssr: boolean;
  readonly router: boolean;
  readonly forms: boolean;
  readonly relay: boolean;
  readonly runInstall: boolean;
}

const prompts: PromptDefinition[] = [
  {
    name: "appPath",
    type: "text",
    message: "Application directory name:",
    default: "my-app",
    positional: true,
    group: "Application",
  },
  {
    name: "ssr",
    type: "confirm",
    message: "Include SSR?",
    default: true,
    group: "Application",
  },
  {
    name: "router",
    type: "confirm",
    message: "Include router?",
    default: true,
    group: "Application",
  },
  {
    name: "forms",
    type: "confirm",
    message: "Include form components?",
    default: true,
    group: "Application",
  },
  {
    name: "relay",
    type: "confirm",
    message: "Include a Relay (GraphQL) data layer with a local mock schema?",
    default: false,
    group: "Application",
  },
  {
    name: "runInstall",
    type: "confirm",
    message: "Install dependencies now?",
    default: true,
    group: "Application",
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "templates");

/** Resolve a path inside the templates directory. */
const src = (templatePath: string) => path.join(templatesDir, templatePath);

export const generator: GeneratorDefinition<ApplicationReactAnswers> = {
  meta: {
    name: "application/react",
    displayName: "@canonical/summon-application:application/react",
    description: "Scaffold a complete React application with SSR and routing",
    version: "0.1.0",
    help: `Creates a full React application with:
  - Vite build + dev server
  - Server-side rendering (Express + Bun dev servers)
  - Routing with @canonical/router-core
  - Head management with @canonical/react-head
  - Two domains (marketing + account) with pages
  - Contact domain with form components (when --forms is enabled)
  - Relay (GraphQL) data layer with a local mock schema, catalog example
    domain, and Storybook mocking (when --relay is enabled)
  - Navigation, ThemeSelector, ExampleComponent
  - Storybook with router decorator
  - Biome + TypeScript configuration

Requires both --ssr and --router flags.`,
    examples: [
      "summon application/react my-app",
      "summon application/react --forms my-app",
      "summon application/react --relay my-app",
      "summon application/react --ssr --router --forms --relay my-app",
    ],
  },

  prompts,

  generate: (answers) => {
    if (!answers.ssr || !answers.router) {
      throw new Error(
        "The application/react generator requires both --ssr and --router. " +
          "Standalone SPA mode is not supported.",
      );
    }

    // The app path is a directory path, not a route path — keep it as given
    // (absolute or relative), only trimming surrounding whitespace and any
    // trailing slash.
    const appPath =
      (answers.appPath || "my-app").trim().replace(/\/+$/, "") || "my-app";

    // The package name is the final path segment. For "." / "" / "/" (scaffold
    // into the current dir) basename gives "."/"" — resolve against the real
    // directory so the name is the actual folder name. Then slugify to an
    // npm-safe form (lowercase, safe chars).
    const rawName = path.basename(path.resolve(appPath));
    const name = rawName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[._-]+|[._-]+$/g, "");

    if (!name) {
      throw new Error(
        `Could not derive a valid application name from path "${appPath}". ` +
          "Pass an explicit directory name (lowercase letters/digits).",
      );
    }

    const dest = (...segments: string[]) => path.join(appPath, ...segments);
    const copy = (filePath: string) => copyFile(src(filePath), dest(filePath));

    // Resolve the @canonical/* version range first (latest from npm, with an
    // offline fallback), then build the rest of the pipeline with it baked into
    // the template vars.
    return flatMap(resolvePragmaVersion(), (pragmaVersion) => {
      const vars = withHelpers({
        name,
        forms: answers.forms,
        relay: answers.relay,
        pragmaVersion,
      });

      // Detect an available package manager for both the (optional) install
      // step and the closing message, so the suggested commands reflect what's
      // actually on the machine.
      const pm = pickPackageManager();
      // Build the install task only when a package manager was actually found —
      // this narrows `pm` to non-null, so the install command never invents a
      // manager. `null` when we won't (or can't) install.
      const installTask =
        answers.runInstall && pm !== null
          ? sequence_([
              info(`Installing dependencies with ${pm}...`),
              exec(pm, ["install"], appPath),
            ])
          : null;
      // The closing command only names a package manager we actually found; if
      // none was detected we don't invent one (previously this suggested `bun`
      // even on a machine without bun), and instead point the user at the
      // package-manager step.
      const finalMessage = installTask
        ? `Application "${appPath}" created. Run \`cd ${appPath} && ${pm} run dev\` to start.`
        : pm
          ? `Application "${appPath}" created. Run \`cd ${appPath} && ${pm} install && ${pm} run dev\` to start.`
          : `Application "${appPath}" created. Install a package manager (bun, pnpm, npm, or yarn), then run \`cd ${appPath} && <pm> install && <pm> run dev\` to start.`;

      return sequence_([
        // Warn (don't block) if the destination already exists — scaffolding
        // will overwrite files in place.
        flatMap(exists(appPath), (present) =>
          when(
            present,
            warn(
              `"${appPath}" already exists — existing files may be overwritten.`,
            ),
          ),
        ),
        info(`Scaffolding React application in "${appPath}"...`),

        // EJS templates (files needing interpolation)
        template({
          source: src("package.json.ejs"),
          dest: dest("package.json"),
          vars,
        }),
        template({
          source: src("README.md.ejs"),
          dest: dest("README.md"),
          vars,
        }),
        template({
          source: src("biome.json.ejs"),
          dest: dest("biome.json"),
          vars,
        }),

        // Root config
        // tsconfig (EJS — #relay path alias only when --relay)
        template({
          source: src("tsconfig.json.ejs"),
          dest: dest("tsconfig.json"),
          vars,
        }),
        // vite config (EJS — vite-plugin-relay-lite only when --relay)
        template({
          source: src("vite.config.ts.ejs"),
          dest: dest("vite.config.ts"),
          vars,
        }),
        copy("vitest.config.ts"),
        // vitest setup (EJS — relay-test-utils' jest→vi alias only when --relay)
        template({
          source: src("vitest.setup.ts.ejs"),
          dest: dest("vitest.setup.ts"),
          vars,
        }),
        copy("vitest.e2e.config.ts"),
        // Relay compiler config (validates queries against the mock SDL)
        when(answers.relay, copy("relay.config.json")),
        // index.html (EJS — <title> uses the app name)
        template({
          source: src("index.html.ejs"),
          dest: dest("index.html"),
          vars,
        }),
        // The template is stored as `gitignore` (no leading dot): npm strips a
        // literal `.gitignore` from published tarballs, so we ship it dotless and
        // restore the dot at write time.
        copyFile(src("gitignore"), dest(".gitignore")),
        // The app's browser floor, read by vite.config.ts to derive Lightning
        // CSS targets. Unlike `.gitignore` above, npm does not strip
        // `.browserslistrc` from tarballs, so the template keeps its dot.
        copy(".browserslistrc"),

        // E2e tests (the 2×3 server matrix + its spawn/teardown harness)
        copy("test/e2e/serverHarness.ts"),
        copy("test/e2e/servers.e2e.ts"),

        // Styles
        // styles (EJS — form stylesheet imported only when --forms)
        template({
          source: src("src/styles/index.css.ejs"),
          dest: dest("src/styles/index.css"),
          vars,
        }),
        copy("src/styles/app.css"),

        // Client (EJS — RelayEnvironmentProvider only when --relay)
        template({
          source: src("src/client/entry.tsx.ejs"),
          dest: dest("src/client/entry.tsx"),
          vars,
        }),

        // Server — dev (Vite + HMR) and preview (compiled) servers each route
        // between the app + sitemap renderers; the renderers stay routing-agnostic.
        // Server entry (EJS — a per-request RelayEnvironmentProvider only when --relay)
        template({
          source: src("src/server/entry.tsx.ejs"),
          dest: dest("src/server/entry.tsx"),
          vars,
        }),
        copy("src/server/renderer.tsx"),
        copy("src/server/server.express.ts"),
        copy("src/server/server.bun.ts"),
        copy("src/server/preview.express.ts"),
        copy("src/server/preview.bun.ts"),

        // Sitemap (rendered route at /sitemap.xml)
        copy("src/sitemap/renderer.ts"),
        // sitemap getters (EJS — /contact entry only when --forms, /catalog
        // entry only when --relay)
        template({
          source: src("src/sitemap/getSitemapItems.ts.ejs"),
          dest: dest("src/sitemap/getSitemapItems.ts"),
          vars,
        }),

        // Domain: marketing
        copy("src/domains/marketing/HomePage.tsx"),
        copy("src/domains/marketing/GuidePage.tsx"),
        copy("src/domains/marketing/routes.ts"),

        // Domain: account
        copy("src/domains/account/AccountPage.tsx"),
        copy("src/domains/account/LoginPage.tsx"),
        copy("src/domains/account/routes.ts"),

        // Domain: contact (when --forms is enabled)
        when(answers.forms, copy("src/domains/contact/ContactPage.tsx")),
        when(answers.forms, copy("src/domains/contact/routes.ts")),

        // Relay data layer (when --relay is enabled): environment factory +
        // executable mock schema, the catalog example domain, and the
        // ClientOnly SSR guard (whose only consumer today is the catalog page).
        when(answers.relay, copy("src/relay/schema.graphql")),
        when(answers.relay, copy("src/relay/schema.ts")),
        when(answers.relay, copy("src/relay/schema.tests.ts")),
        when(answers.relay, copy("src/relay/environment.ts")),
        when(answers.relay, copy("src/relay/environment.tests.ts")),
        // Committed relay-compiler artifacts — deterministic outputs of the
        // committed schema + the catalog queries; `bun run relay` regenerates
        // them in the scaffolded app after any schema or graphql-tag edit.
        when(
          answers.relay,
          copy("src/relay/__generated__/ProductCard_product.graphql.ts"),
        ),
        when(
          answers.relay,
          copy("src/relay/__generated__/ProductListQuery.graphql.ts"),
        ),

        // Domain: catalog (when --relay is enabled)
        when(answers.relay, copy("src/domains/catalog/CatalogPage.tsx")),
        when(answers.relay, copy("src/domains/catalog/ProductList.tsx")),
        when(
          answers.relay,
          copy("src/domains/catalog/ProductList.stories.tsx"),
        ),
        when(answers.relay, copy("src/domains/catalog/ProductList.tests.tsx")),
        when(answers.relay, copy("src/domains/catalog/ProductCard.tsx")),
        when(answers.relay, copy("src/domains/catalog/ErrorBoundary.tsx")),
        when(
          answers.relay,
          copy("src/domains/catalog/ErrorBoundary.tests.tsx"),
        ),
        when(answers.relay, copy("src/domains/catalog/routes.ts")),

        // Standalone dependency patches (when --relay is enabled): a generated
        // app cannot inherit the monorepo's patches/, so they ship with the
        // scaffold and are applied via "patchedDependencies" in package.json.
        // react-relay: cjs-module-lexer export hints so named imports survive
        // Node SSR externalisation.
        when(answers.relay, copy("patches/react-relay@18.2.0.patch")),
        // relay-runtime-network: fixes the broken package `imports` map.
        // Temporary until the fixed upstream release lands (advl/lit-relay#32);
        // then this patch and its patchedDependencies entry can be dropped.
        when(answers.relay, copy("patches/relay-runtime-network@0.1.0.patch")),

        // Routes (EJS — conditionally includes contact + catalog domains)
        template({
          source: src("src/routes.tsx.ejs"),
          dest: dest("src/routes.tsx"),
          vars,
        }),

        // Lib: Navigation (EJS — contact link only when --forms, catalog
        // link only when --relay)
        template({
          source: src("src/lib/Navigation/Navigation.tsx.ejs"),
          dest: dest("src/lib/Navigation/Navigation.tsx"),
          vars,
        }),
        copy("src/lib/Navigation/index.ts"),

        // Lib: ThemeSelector
        copy("src/lib/ThemeSelector/ThemeSelector.tsx"),
        copy("src/lib/ThemeSelector/index.ts"),

        // Lib: ExampleComponent
        copy("src/lib/ExampleComponent/ExampleComponent.tsx"),
        copy("src/lib/ExampleComponent/ExampleComponent.stories.tsx"),
        copy("src/lib/ExampleComponent/ExampleComponent.tests.tsx"),
        copy("src/lib/ExampleComponent/index.ts"),
        copy("src/lib/ExampleComponent/types.ts"),
        copy("src/lib/ExampleComponent/styles.css"),

        // Lib: LazyComponent
        copy("src/lib/LazyComponent/LazyComponent.tsx"),
        copy("src/lib/LazyComponent/LazyComponent.stories.tsx"),
        copy("src/lib/LazyComponent/index.ts"),

        // Lib: ClientOnly (when --relay is enabled — the catalog page is its
        // only consumer, keeping Relay queries off the server render until
        // SSR data serialization/hydration is supported)
        when(answers.relay, copy("src/lib/ClientOnly/ClientOnly.tsx")),
        when(answers.relay, copy("src/lib/ClientOnly/ClientOnly.tests.tsx")),
        when(answers.relay, copy("src/lib/ClientOnly/index.ts")),

        // Lib barrel (EJS — ClientOnly export only when --relay)
        template({
          source: src("src/lib/index.ts.ejs"),
          dest: dest("src/lib/index.ts"),
          vars,
        }),

        // Vite types
        copy("src/vite-env.d.ts"),

        // Storybook
        // main config (EJS — the relay mocking addon only when --relay)
        template({
          source: src(".storybook/main.ts.ejs"),
          dest: dest(".storybook/main.ts"),
          vars,
        }),
        copy(".storybook/preview.ts"),
        copy(".storybook/decorators/withRouter.tsx"),
        copy(".storybook/decorators/index.ts"),

        // Static asset dirs (kept by placeholder; both wired into Storybook staticDirs)
        copy("src/assets/.gitkeep"),
        copy("public/.gitkeep"),
        copy("public/robots.txt"),

        // Install dependencies with the detected package manager, or a no-op
        // when none was found / the user declined. Built above where `pm` is
        // narrowed to non-null, so the install command never invents a manager;
        // the scaffold completes and the closing message says what to run.
        installTask ?? pure(undefined),

        info(finalMessage),
      ]);
    });
  },
};

export default generator;
