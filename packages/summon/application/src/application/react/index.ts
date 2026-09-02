import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GeneratorDefinition,
  LoadedTemplate,
  PromptDefinition,
} from "@canonical/summon-core";
import {
  loadTemplateSync,
  rawFile,
  template,
  withHelpers,
} from "@canonical/summon-core";
import {
  exec,
  exists,
  fail,
  flatMap,
  info,
  pure,
  sequence_,
  warn,
  when,
} from "@canonical/task";
import { pickPackageManager } from "../../shared/packageManager.js";
import { packageVersion } from "../../shared/packageVersion.js";
import { validateAppPath } from "../../shared/validators.js";
import { resolvePragmaVersion } from "../../shared/versions.js";
import { findEnclosingWorkspaceRoot } from "../../shared/workspace.js";

export interface ApplicationReactAnswers {
  readonly appPath: string;
  readonly forms: boolean;
  readonly intl: boolean;
  readonly rendering: "ssr" | "spa";
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
    validate: validateAppPath,
    group: "Application",
  },
  // The router is NOT a prompt: it is always on (every template assumes it), so
  // a question that only ever accepted its default was a dead wizard step and,
  // worse, an unanswerable refusal — a default-`true` confirm can be made
  // explicit ONLY by negating it (`--no-router`), which the old cross-answer
  // guard then rejected, leaving `create application react` with no reachable
  // all-flags completion. SSR was retired alongside it for the same reason, but
  // the reason has since expired: `rendering` below IS the second answer SSR
  // lacked. It is a select rather than a revived confirm, so its explicit
  // spelling is a VALUE (`--rendering spa`) and never a negation — the shape
  // that made the old pair unanswerable. No cross-answer guard comes back.
  {
    name: "forms",
    type: "confirm",
    message: "Include form components?",
    default: true,
    group: "Application",
  },
  {
    name: "intl",
    type: "confirm",
    message:
      "Include internationalisation (locale negotiation, translated UI, locale switcher)?",
    default: false,
    group: "Application",
  },
  // A select, not a confirm: rendering is an axis with two answers, not a
  // capability you bolt on, and the wizard should show both. Note the frozen
  // covenant's flag array is compared index-wise
  // (kernel/spec/surfaceConformance.ts), and that order derives from this list.
  {
    name: "rendering",
    type: "select",
    message:
      "Rendering — ssr keeps the server layer (SSR servers and sitemap), spa is client-only",
    choices: [
      {
        label: "ssr - server-side rendering (Express + Bun servers, sitemap)",
        value: "ssr",
      },
      {
        label: "spa - client-only single-page app (no server layer)",
        value: "spa",
      },
    ],
    default: "ssr",
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

/**
 * Carried templates, read on first `generate()` and cached by path — never at
 * module eval, so importing the generator costs no filesystem work.
 */
const templateCache = new Map<string, LoadedTemplate>();
function load(templatePath: string): LoadedTemplate {
  let loaded = templateCache.get(templatePath);
  if (!loaded) {
    loaded = loadTemplateSync(src(templatePath));
    templateCache.set(templatePath, loaded);
  }
  return loaded;
}

export const generator: GeneratorDefinition<ApplicationReactAnswers> = {
  meta: {
    name: "application/react",
    displayName: "@canonical/summon-application:application/react",
    description:
      "Scaffold a complete React application with routing, and either server-side rendering or a client-only SPA",
    version: packageVersion(),
    help: `Creates a full React application with:
  - Vite build + dev server
  - Server-side rendering (Express + Bun dev servers) — the default
    --rendering ssr; --rendering spa omits the whole server layer
  - Routing with @canonical/router-core
  - Head management with @canonical/react-head
  - Two domains (marketing + account) with pages
  - Contact domain with form components (on by default; omit with --no-forms)
  - Relay (GraphQL) data layer with a local mock schema, catalog example
    domain, and Storybook mocking (when --relay is enabled)
  - Navigation, ThemeSelector, ExampleComponent
  - Storybook with router decorator
  - Biome + TypeScript configuration

Routing is always included. Rendering is a choice: ssr (the default) or spa,
which omits the server layer entirely — no src/server/, no sitemap, no
express/tsx/bun-types. Under spa the client router still handles the auth
redirect, the /home redirect and the not-found route, but a cold request gets
no 302/301/404 HTTP status and no server-painted first paint, so expect a
brief default theme/locale flash. A static host will need a history-API
fallback.`,
    examples: [
      "summon application/react my-app",
      "summon application/react --no-forms my-app",
      "summon application/react --relay my-app",
      "summon application/react --rendering spa my-app",
      "summon application/react --no-forms --relay my-app",
    ],
  },

  prompts,

  generate: (answers) => {
    // One axis, one boolean. The templates gate on `spa`, not on the answer
    // string, so the prompt's shape is not their concern.
    const spa = answers.rendering === "spa";
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
      return fail({
        code: "APP_NAME_INVALID",
        message:
          `Could not derive a valid application name from path "${appPath}". ` +
          "Pass an explicit directory name (lowercase letters/digits).",
      });
    }

    const dest = (...segments: string[]) => path.join(appPath, ...segments);
    const copy = (filePath: string) =>
      rawFile({
        source: src(filePath),
        content: load(filePath).content,
        dest: dest(filePath),
      });

    // Whether the app lands inside a bun workspace decides who owns dependency
    // patching: bun resolves `patchedDependencies` paths from the WORKSPACE
    // ROOT, so an app-local block inside a workspace aborts `bun install`
    // ("Couldn't find patch file") and leaves the workspace unlinked. Inside a
    // workspace the root owns patching and the scaffold emits no patches;
    // standalone apps get their own patches/ + patchedDependencies.
    const workspaceRoot = findEnclosingWorkspaceRoot(path.resolve(appPath));
    const standalone = workspaceRoot === null;

    // Guard BEFORE any network: refusing an existing destination is locally
    // decidable, so it must not wait on (or block behind) the npm lookup.
    // Every write's default undo is a delete, so overwrite-then-`--undo`
    // would destroy files the user owned before the run (the same guard
    // domain/wrapper apply).
    return flatMap(exists(appPath), (present) => {
      if (present) {
        return fail({
          code: "APP_DEST_EXISTS",
          message:
            `"${appPath}" already exists. Scaffolding over it would let ` +
            "--undo delete pre-existing files. Choose a different " +
            "directory or remove it first.",
        });
      }
      // Resolve the @canonical/* version range (latest from npm, with an
      // offline fallback), then build the rest of the pipeline with it baked
      // into the template vars.
      return flatMap(resolvePragmaVersion(), (pragmaVersion) => {
        const vars = withHelpers({
          name,
          forms: answers.forms,
          intl: answers.intl,
          relay: answers.relay,
          spa,
          standalone,
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
          info(`Scaffolding React application in "${appPath}"...`),
          // The scaffolded package.json composes its scripts with `bun run`; on
          // a machine where another manager was detected, say so up front.
          when(
            pm !== null && pm !== "bun",
            warn(
              `Detected ${pm}, but the generated scripts use \`bun run\` — ` +
                "install bun to run the app's composite scripts.",
            ),
          ),
          // The SPA arm trades away things SSR gives for free. Say so at
          // scaffold time rather than leaving it to the README.
          when(
            spa,
            info(
              "Client-only SPA: no src/server/ and no /sitemap.xml. The router " +
                "still handles the auth redirect, the /home redirect and the " +
                "not-found route, but a cold request gets no 302/301/404 HTTP " +
                "status and no server-painted first paint (expect a brief " +
                "default theme/locale flash). Static hosting needs a " +
                "history-API fallback.",
            ),
          ),

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
          rawFile({
            source: src("gitignore"),
            content: load("gitignore").content,
            dest: dest(".gitignore"),
          }),
          // The app's browser floor, read by vite.config.ts to derive Lightning
          // CSS targets. Unlike `.gitignore` above, npm does not strip
          // `.browserslistrc` from tarballs, so the template keeps its dot.
          copy(".browserslistrc"),

          // E2e tests (the 2×3 server matrix + its spawn/teardown harness)
          copy("test/e2e/serverHarness.ts"),
          template({
            source: src("test/e2e/servers.e2e.ts.ejs"),
            dest: dest("test/e2e/servers.e2e.ts"),
            vars,
          }),

          // Styles
          // styles (EJS — form stylesheet imported only when forms is on)
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

          // Server (omitted by the SPA arm) — dev (Vite + HMR) and preview (compiled)
          // servers each route between the app + sitemap renderers; the renderers
          // stay routing-agnostic.
          // Server entry (EJS — a per-request RelayEnvironmentProvider only when --relay)
          when(
            !spa,
            template({
              source: src("src/server/entry.tsx.ejs"),
              dest: dest("src/server/entry.tsx"),
              vars,
            }),
          ),
          when(
            !spa,
            template({
              source: src("src/server/renderer.tsx.ejs"),
              dest: dest("src/server/renderer.tsx"),
              vars,
            }),
          ),
          when(
            !spa,
            template({
              source: src("src/server/server.express.ts.ejs"),
              dest: dest("src/server/server.express.ts"),
              vars,
            }),
          ),
          when(
            !spa,
            template({
              source: src("src/server/server.bun.ts.ejs"),
              dest: dest("src/server/server.bun.ts"),
              vars,
            }),
          ),
          when(!spa, copy("src/server/preview.express.ts")),
          when(!spa, copy("src/server/preview.bun.ts")),

          // Sitemap (rendered route at /sitemap.xml) — omitted by the SPA arm.
          // The getters are portable, but the renderer is the only consumer and it
          // is served at runtime by the servers above; keeping either would hold
          // @canonical/react-ssr as a dependency for dead code.
          when(!spa, copy("src/sitemap/renderer.ts")),
          // sitemap getters (EJS — /contact entry only when forms is on, /catalog
          // entry only when relay is on)
          when(
            !spa,
            template({
              source: src("src/sitemap/getSitemapItems.ts.ejs"),
              dest: dest("src/sitemap/getSitemapItems.ts"),
              vars,
            }),
          ),

          // Domain: marketing
          template({
            source: src("src/domains/marketing/HomePage.tsx.ejs"),
            dest: dest("src/domains/marketing/HomePage.tsx"),
            vars,
          }),
          template({
            source: src("src/domains/marketing/GuidePage.tsx.ejs"),
            dest: dest("src/domains/marketing/GuidePage.tsx"),
            vars,
          }),
          copy("src/domains/marketing/routes.ts"),

          // Domain: account
          template({
            source: src("src/domains/account/AccountPage.tsx.ejs"),
            dest: dest("src/domains/account/AccountPage.tsx"),
            vars,
          }),
          template({
            source: src("src/domains/account/LoginPage.tsx.ejs"),
            dest: dest("src/domains/account/LoginPage.tsx"),
            vars,
          }),
          copy("src/domains/account/routes.ts"),

          // Domain: contact (when forms is on)
          when(
            answers.forms,
            template({
              source: src("src/domains/contact/ContactPage.tsx.ejs"),
              dest: dest("src/domains/contact/ContactPage.tsx"),
              vars,
            }),
          ),
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
          when(
            answers.relay,
            template({
              source: src("src/domains/catalog/CatalogPage.tsx.ejs"),
              dest: dest("src/domains/catalog/CatalogPage.tsx"),
              vars,
            }),
          ),
          when(
            answers.relay,
            template({
              source: src("src/domains/catalog/ProductList.tsx.ejs"),
              dest: dest("src/domains/catalog/ProductList.tsx"),
              vars,
            }),
          ),
          when(
            answers.relay,
            template({
              source: src("src/domains/catalog/ProductList.stories.tsx.ejs"),
              dest: dest("src/domains/catalog/ProductList.stories.tsx"),
              vars,
            }),
          ),
          when(
            answers.relay,
            template({
              source: src("src/domains/catalog/ProductList.tests.tsx.ejs"),
              dest: dest("src/domains/catalog/ProductList.tests.tsx"),
              vars,
            }),
          ),
          when(
            answers.relay,
            template({
              source: src("src/domains/catalog/ProductCard.tsx.ejs"),
              dest: dest("src/domains/catalog/ProductCard.tsx"),
              vars,
            }),
          ),
          when(answers.relay, copy("src/domains/catalog/ErrorBoundary.tsx")),
          when(
            answers.relay,
            template({
              source: src("src/domains/catalog/ErrorBoundary.tests.tsx.ejs"),
              dest: dest("src/domains/catalog/ErrorBoundary.tests.tsx"),
              vars,
            }),
          ),
          when(answers.relay, copy("src/domains/catalog/routes.ts")),

          // Standalone dependency patches (when --relay is enabled): a
          // standalone app cannot inherit a workspace's patches/, so they ship
          // with the scaffold and are applied via "patchedDependencies" in
          // package.json. Inside a bun workspace the WORKSPACE ROOT owns
          // patching — bun resolves patch paths from the root, so an app-local
          // block would abort `bun install` ("Couldn't find patch file") —
          // hence neither patches/ nor patchedDependencies are emitted there.
          when(
            answers.relay && !standalone,
            info(
              `Scaffolding into the bun workspace at "${workspaceRoot}" — ` +
                "dependency patches are owned by the workspace root, so no " +
                "app-local patches/ or patchedDependencies were emitted. " +
                "Ensure the workspace root patches react-relay, relay-runtime " +
                "and relay-runtime-network (see the app README).",
            ),
          ),
          // react-relay: cjs-module-lexer export hints so named imports survive
          // Node SSR externalisation.
          when(
            answers.relay && standalone,
            copy("patches/react-relay@21.0.1.patch"),
          ),
          // relay-runtime: real `module.exports.X = undefined;` assignments for
          // type-only names (ConcreteRequest, ReaderFragment, FragmentRefs…)
          // that relay-compiler's TypeScript artifacts import as values —
          // strict ESM-CJS interop (Node ESM, Vite's SSR module runner, Bun)
          // rejects them otherwise. Real assignments, not a dead-branch lexer
          // hint: Bun's interop reflects the actual runtime exports object.
          when(
            answers.relay && standalone,
            copy("patches/relay-runtime@21.0.1.patch"),
          ),
          // relay-runtime-network: fixes the broken package `imports` map.
          // Temporary until the fixed upstream release lands (advl/lit-relay#32);
          // then this patch and its patchedDependencies entry can be dropped.
          when(
            answers.relay && standalone,
            copy("patches/relay-runtime-network@0.1.0.patch"),
          ),

          // Routes (EJS — conditionally includes contact + catalog domains)
          template({
            source: src("src/routes.tsx.ejs"),
            dest: dest("src/routes.tsx"),
            vars,
          }),

          // Lib: Navigation (EJS — contact link only when forms is on, catalog
          // link only when relay is on)
          template({
            source: src("src/lib/Navigation/Navigation.tsx.ejs"),
            dest: dest("src/lib/Navigation/Navigation.tsx"),
            vars,
          }),
          copy("src/lib/Navigation/index.ts"),

          // Lib: ThemeSelector
          template({
            source: src("src/lib/ThemeSelector/ThemeSelector.tsx.ejs"),
            dest: dest("src/lib/ThemeSelector/ThemeSelector.tsx"),
            vars,
          }),
          copy("src/lib/ThemeSelector/index.ts"),

          // Lib: LocaleSelector (when --intl is enabled)
          when(answers.intl, copy("src/lib/LocaleSelector/LocaleSelector.tsx")),
          when(
            answers.intl,
            copy("src/lib/LocaleSelector/LocaleSelector.tests.tsx"),
          ),
          when(answers.intl, copy("src/lib/LocaleSelector/index.ts")),

          // i18n (when --intl is enabled): locale config, one catalog per
          // locale, negotiation tests
          when(answers.intl, copy("src/i18n/config.ts")),
          when(answers.intl, copy("src/i18n/catalogs.ts")),
          when(answers.intl, copy("src/i18n/en.ts")),
          when(answers.intl, copy("src/i18n/fr.ts")),
          when(answers.intl, copy("src/i18n/ar.ts")),
          when(answers.intl, copy("src/i18n/index.ts")),
          when(answers.intl, copy("src/i18n/negotiation.tests.ts")),

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

          // Lib: ClientOnly (when --relay is enabled, on the SSR arm only — it is
          // an SSR-safety wrapper that defers a subtree past the first hydration
          // pass, which in a client-only app is a guaranteed no-op)
          when(
            answers.relay && !spa,
            copy("src/lib/ClientOnly/ClientOnly.tsx"),
          ),
          when(
            answers.relay && !spa,
            copy("src/lib/ClientOnly/ClientOnly.tests.tsx"),
          ),
          when(answers.relay && !spa, copy("src/lib/ClientOnly/index.ts")),

          // Lib barrel (EJS — ClientOnly export only when --relay, on the SSR arm)
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
          template({
            source: src(".storybook/preview.ts.ejs"),
            dest: dest(".storybook/preview.ts"),
            vars,
          }),
          copy(".storybook/decorators/withRouter.tsx"),
          when(answers.intl, copy(".storybook/decorators/withI18n.tsx")),
          template({
            source: src(".storybook/decorators/index.ts.ejs"),
            dest: dest(".storybook/decorators/index.ts"),
            vars,
          }),

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
    });
  },
};

export default generator;
