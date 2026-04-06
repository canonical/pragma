import * as path from "node:path";
import type { GeneratorDefinition, PromptDefinition } from "@canonical/summon-core";
import {
  debug,
  exec,
  info,
  map,
  mkdir,
  sequence_,
  when,
  writeFile,
} from "@canonical/task";
import pkg from "../../../package.json" with { type: "json" };

interface ApplicationAnswers {
  readonly appPath: string;
  readonly router: boolean;
  readonly runInstall: boolean;
  readonly ssr: boolean;
}

const prompts: PromptDefinition[] = [
  {
    name: "appPath",
    type: "text",
    message: "Application path:",
    default: "my-react-app",
    group: "Application",
  },
  {
    name: "ssr",
    type: "confirm",
    message: "Enable SSR?",
    default: false,
    group: "Features",
  },
  {
    name: "router",
    type: "confirm",
    message: "Enable @canonical/router-core and @canonical/router-react?",
    default: false,
    group: "Features",
  },
  {
    name: "runInstall",
    type: "confirm",
    message: "Run bun install after generation?",
    default: false,
    group: "Post-setup",
  },
];

function appPackageJson(appName: string): string {
  return `${JSON.stringify(
    {
      name: appName,
      private: true,
      version: "0.22.0",
      type: "module",
      license: "GPL-3.0-only",
      scripts: {
        dev: "vite",
        build: "bun run build:client && bun run build:server",
        "build:client": "vite build --ssrManifest --outDir dist/client",
        "build:server": "vite build --ssr src/ssr/server.ts --outDir dist/server",
        serve: "bun run build && node dist/server/server.js",
        check: "bun run check:biome && bun run check:ts",
        "check:biome": "biome check",
        "check:biome:fix": "biome check --write",
        "check:ts": "tsc --noEmit",
      },
      dependencies: {
        "@canonical/react-ssr": "^0.22.0",
        "@canonical/router-core": "^0.22.0",
        "@canonical/router-react": "^0.22.0",
        express: "^5.2.1",
        react: "^19.2.4",
        "react-dom": "^19.2.4",
      },
      devDependencies: {
        "@biomejs/biome": "2.4.9",
        "@canonical/biome-config": "^0.22.0",
        "@canonical/typescript-config-react": "^0.22.0",
        "@types/express": "^5.0.6",
        "@types/node": "^24.12.0",
        "@types/react": "^19.2.14",
        "@types/react-dom": "^19.2.3",
        "@vitejs/plugin-react": "^6.0.0",
        typescript: "^5.9.3",
        vite: "^8.0.1",
        "vite-tsconfig-paths": "^6.1.1",
      },
    },
    null,
    2,
  )}\n`;
}

const tsconfigJson = `{
  "extends": "@canonical/typescript-config-react",
  "compilerOptions": {
    "baseUrl": "src",
    "skipLibCheck": true,
    "types": ["node", "react", "react-dom"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"]
}\n`;

const viteConfigTs = `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
});
`;

const biomeJson = `{
  "extends": ["@canonical/biome-config"]
}\n`;

const gitignore = `node_modules
.DS_Store
dist
coverage
`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Canonical router app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ssr/entry-client.tsx"></script>
  </body>
</html>
`;

const indexCss = `:root {
  background:
    radial-gradient(circle at top, rgba(15, 98, 254, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  color: #111827;
  font-family: Inter, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

a {
  color: inherit;
}
`;

const applicationCss = `#root {
  min-height: 100vh;
}

.app-shell {
  box-sizing: border-box;
  display: grid;
  gap: 2rem;
  margin: 0 auto;
  max-width: 1120px;
  min-height: 100vh;
  padding: 3rem 1.5rem;
}

.shell-header {
  align-items: start;
  display: grid;
  gap: 1.5rem;
}

.shell-title {
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 0;
}

.shell-copy,
.lede {
  color: #4b5563;
  font-size: 1.05rem;
  line-height: 1.7;
  margin: 0;
}

.shell-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.shell-nav a {
  background: #ffffff;
  border: 1px solid #d7dbe6;
  border-radius: 999px;
  color: #111827;
  padding: 0.7rem 1rem;
  text-decoration: none;
}

.shell-main {
  display: grid;
}

.route-panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.5rem;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
  padding: 2rem;
}

.eyebrow {
  color: #0f62fe;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
}

.feature-list {
  display: grid;
  gap: 0.9rem;
  margin: 0;
  padding-left: 1.2rem;
}

.route-fallback {
  color: #4b5563;
  margin: 0;
}

.stack {
  display: grid;
  gap: 1rem;
}

.stack-tight {
  display: grid;
  gap: 0.5rem;
}
`;

const shellTsx = `import type { ReactElement, ReactNode } from "react";
import Navigation from "./Navigation.js";

interface ShellProps {
  readonly children: ReactNode;
}

export default function Shell({ children }: ShellProps): ReactElement {
  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="brand stack-tight">
          <p className="eyebrow">Summon application</p>
          <h1 className="shell-title">React SSR router app</h1>
          <p className="shell-copy">
            Generated by <strong>summon application react --ssr --router</strong>.
          </p>
        </div>
        <Navigation />
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
}
`;

const navigationTsx = `import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";

export default function Navigation(): ReactElement {
  return (
    <nav aria-label="Primary" className="shell-nav">
      <Link to="home">
        Home
      </Link>
      <Link to="about">
        About
      </Link>
    </nav>
  );
}
`;

const wrapperTsx = `import { wrapper } from "@canonical/router-core";
import type { ReactElement } from "react";
import Shell from "../Shell.js";

export const appShell = wrapper<void, ReactElement>({
  id: "app-shell",
  component: ({ children }): ReactElement => {
    return <Shell>{children}</Shell>;
  },
});

export default appShell;
`;

const wrappersIndexTs = `export { appShell } from "./app-shell.js";
`;

const homeRouteTsx = `import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

interface HomeData {
  readonly highlights: readonly string[];
}

const homeRoute = route({
  url: "/",
  fetch: async (): Promise<HomeData> => ({
    highlights: [
      "Flat route definitions stay easy to extend.",
      "SSR and hydration share the same route map.",
      "Summon can scaffold new routes and wrappers as your app grows.",
    ],
  }),
  content: ({ data }: { data: HomeData }): ReactElement => {
    return (
      <section className="route-panel stack" aria-labelledby="home-title">
        <p className="eyebrow">Home route</p>
        <h1 id="home-title">Canonical router starter</h1>
        <p className="lede">
          This route comes from the generated React application preset.
        </p>
        <ul className="feature-list">
          {data.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </section>
    );
  },
});

export default homeRoute;
`;

const aboutRouteTsx = `import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

interface AboutData {
  readonly bullets: readonly string[];
}

const aboutRoute = route({
  url: "/about",
  fetch: async (): Promise<AboutData> => ({
    bullets: [
      "Use summon route settings/billing to add a new route module.",
      "Use summon wrapper settings to add a reusable layout boundary.",
      "Keep app-specific assembly in src/router.tsx.",
    ],
  }),
  content: ({ data }: { data: AboutData }): ReactElement => {
    return (
      <section className="route-panel stack" aria-labelledby="about-title">
        <p className="eyebrow">About route</p>
        <h1 id="about-title">Why this preset exists</h1>
        <p className="lede">
          It replaces deprecated generator-ds app scaffolding with a Summon-native application flow.
        </p>
        <ul className="feature-list">
          {data.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>
    );
  },
});

export default aboutRoute;
`;

const routesIndexTsx = `import { group } from "@canonical/router-core";
import aboutRoute from "./about.js";
import homeRoute from "./home.js";
import { appShell } from "../wrappers/index.js";

const [home, about] = group(appShell, [homeRoute, aboutRoute] as const);

export const appRoutes = {
  home,
  about,
} as const;

export default appRoutes;
`;

const routerTsx = `import {
  type AnyRoute,
  createRouter,
  type NavigationContext,
  type RouteMap,
  type RouteMiddleware,
  type RouterDehydratedState,
  route,
} from "@canonical/router-core";
import { createHydratedRouter } from "@canonical/router-react";
import type { ReactElement } from "react";
import appRoutes from "./routes/index.js";

export type AppRoutes = typeof appRoutes;
export type AppInitialData = RouterDehydratedState<AppRoutes>;

declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: AppRoutes;
  }
}

export function withI18n(defaultLocale: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    const currentFetch = currentRoute.fetch;

    if (!currentFetch) {
      return currentRoute;
    }

    return {
      ...currentRoute,
      fetch: async (params: unknown, search: unknown, context: NavigationContext) => {
        return currentFetch(params, {
          locale: defaultLocale,
          ...(search as Record<string, unknown>),
        }, context);
      },
    };
  }) as RouteMiddleware;
}

const notFoundRoute = route({
  url: "/404",
  content: (): ReactElement => {
    return (
      <section className="route-panel stack" aria-labelledby="not-found-title">
        <p className="eyebrow">Fallback route</p>
        <h1 id="not-found-title">Page not found</h1>
        <p className="lede">
          Add more route modules under src/routes and export them from src/routes/index.tsx.
        </p>
      </section>
    );
  },
});

export function createServerAppRouter(
  initialData?: RouterDehydratedState<RouteMap>,
) {
  return createRouter(appRoutes, {
    hydratedState: initialData,
    middleware: [withI18n("en")],
    notFound: notFoundRoute,
  });
}

export function createHydratedAppRouter() {
  return createHydratedRouter(appRoutes, {
    middleware: [withI18n("en")],
    notFound: notFoundRoute,
  });
}
`;

const ssrDocumentTsx = `import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import type { ReactElement, ReactNode } from "react";

interface DocumentProps extends ServerEntrypointProps<Record<string, unknown>> {
  readonly children: ReactNode;
}

export default function Document(props: DocumentProps): ReactElement {
  return (
    <html lang={props.lang}>
      <head>
        <title>Canonical router starter</title>
        <meta
          name="description"
          content="React SSR starter generated by Summon with @canonical/router-core."
        />
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">{props.children}</div>
      </body>
    </html>
  );
}
`;

const entryClientTsx = `import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import Shell from "../Shell.js";
import { createHydratedAppRouter } from "../router.js";
import "../Application.css";
import "../index.css";

const router = createHydratedAppRouter();

hydrateRoot(
  document,
  <RouterProvider router={router}>
    <Shell>
      <Outlet fallback={<p className="route-fallback">Loading route…</p>} />
    </Shell>
  </RouterProvider>,
);
`;

const entryServerTsx = `import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import type { RouterDehydratedState, RouteMap } from "@canonical/router-core";
import { RouterProvider, ServerRouter } from "@canonical/router-react";
import Shell from "../Shell.js";
import { createServerAppRouter } from "../router.js";
import Document from "./Document.js";

const EntryServer: ServerEntrypoint<Record<string, unknown>> = (props) => {
  const initialData = props.initialData as
    | RouterDehydratedState<RouteMap>
    | undefined;
  const router = createServerAppRouter(initialData);

  return (
    <Document {...props}>
      <RouterProvider router={router}>
        <Shell>
          <ServerRouter
            fallback={<p className="route-fallback">Loading route…</p>}
            router={router}
          />
        </Shell>
      </RouterProvider>
    </Document>
  );
};

export default EntryServer;
`;

const rendererTsx = `import fs from "node:fs/promises";
import path from "node:path";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { createServerAppRouter } from "../router.js";
import EntryServer from "./entry-server.js";

const htmlString = await fs.readFile(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

export default async function prepareRender(requestUrl: string) {
  const router = createServerAppRouter();
  const loadResult = await router.load(requestUrl);
  const initialData = loadResult.dehydrate() as Record<string, unknown>;

  return {
    initialData,
    renderer: new JSXRenderer(EntryServer, initialData, {
      htmlString,
    }),
  };
}
`;

const serverTs = `import * as process from "node:process";
import express from "express";
import prepareRender from "./renderer.js";

const PORT = process.env.PORT || 5173;
const app = express();

app.use("/assets", express.static("dist/client/assets"));

app.use(async (req, res, next) => {
  try {
    const requestUrl = req.originalUrl || req.url || "/";
    const { renderer } = await prepareRender(requestUrl);

    renderer.renderToStream(req, res);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log("Server started on http://localhost:" + PORT + "/");
});

export default app;
`;

const readmeMd = `# React SSR router app

Generated by \`summon application react --ssr --router\`.

## Commands

- \`bun run dev\`
- \`bun run build\`
- \`bun run serve\`
- \`bun run check\`

## Structure

- [src/router.tsx](src/router.tsx) wires router creation and middleware
- [src/routes](src/routes) holds route modules
- [src/wrappers](src/wrappers) holds reusable wrappers
- [src/ssr](src/ssr) contains SSR entry points and the Express server
`;

export const generator: GeneratorDefinition<ApplicationAnswers> = {
  meta: {
    name: "application/react",
    displayName: `${pkg.name}:react`,
    description: "Generate a React application preset that can enable SSR and the Canonical router",
    version: "0.1.0",
    help: `Generate a React application preset for Summon.

CURRENT PRESET:
  This generator currently targets the routed SSR application flow.
  Invoke it as: summon application react --ssr --router

GENERATED STRUCTURE:
  - src/router.tsx
  - src/routes/*
  - src/wrappers/*
  - src/Shell.tsx
  - SSR entry points under src/ssr/
`,
    examples: [
      "summon application react --app-path=my-router-app --ssr --router",
      "summon application react --app-path=apps/customer-portal --ssr --router --run-install",
    ],
  },
  prompts,
  generate: (answers: ApplicationAnswers) => {
    if (!answers.ssr || !answers.router) {
      throw new Error(
        "The current React application preset is the routed SSR preset. Run: summon application react --ssr --router",
      );
    }

    const appName = path.basename(answers.appPath);

    return sequence_([
      info(`Generating React application: ${answers.appPath}`),
      mkdir(answers.appPath),
      mkdir(path.join(answers.appPath, "src")),
      mkdir(path.join(answers.appPath, "src", "routes")),
      mkdir(path.join(answers.appPath, "src", "ssr")),
      mkdir(path.join(answers.appPath, "src", "wrappers")),
      debug("Writing application files"),
      writeFile(path.join(answers.appPath, "package.json"), appPackageJson(appName)),
      writeFile(path.join(answers.appPath, "tsconfig.json"), tsconfigJson),
      writeFile(path.join(answers.appPath, "vite.config.ts"), viteConfigTs),
      writeFile(path.join(answers.appPath, "biome.json"), biomeJson),
      writeFile(path.join(answers.appPath, ".gitignore"), gitignore),
      writeFile(path.join(answers.appPath, "index.html"), indexHtml),
      writeFile(path.join(answers.appPath, "README.md"), readmeMd),
      writeFile(path.join(answers.appPath, "src", "index.css"), indexCss),
      writeFile(path.join(answers.appPath, "src", "Application.css"), applicationCss),
      writeFile(path.join(answers.appPath, "src", "Shell.tsx"), shellTsx),
      writeFile(path.join(answers.appPath, "src", "Navigation.tsx"), navigationTsx),
      writeFile(path.join(answers.appPath, "src", "router.tsx"), routerTsx),
      writeFile(path.join(answers.appPath, "src", "routes", "home.tsx"), homeRouteTsx),
      writeFile(path.join(answers.appPath, "src", "routes", "about.tsx"), aboutRouteTsx),
      writeFile(path.join(answers.appPath, "src", "routes", "index.tsx"), routesIndexTsx),
      writeFile(path.join(answers.appPath, "src", "wrappers", "app-shell.tsx"), wrapperTsx),
      writeFile(path.join(answers.appPath, "src", "wrappers", "index.tsx"), wrappersIndexTs),
      writeFile(path.join(answers.appPath, "src", "ssr", "Document.tsx"), ssrDocumentTsx),
      writeFile(path.join(answers.appPath, "src", "ssr", "entry-client.tsx"), entryClientTsx),
      writeFile(path.join(answers.appPath, "src", "ssr", "entry-server.tsx"), entryServerTsx),
      writeFile(path.join(answers.appPath, "src", "ssr", "renderer.tsx"), rendererTsx),
      writeFile(path.join(answers.appPath, "src", "ssr", "server.ts"), serverTs),
      when(
        answers.runInstall,
        map(exec("bun", ["install"], answers.appPath), () => undefined),
      ),
      info(`Created React application at ${answers.appPath}`),
    ]);
  },
};

export default generator;
