import * as path from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { info, mkdir, sequence_, writeFile } from "@canonical/task";
import { normalizeCommandPath } from "../../shared/casing.js";

interface ApplicationReactAnswers {
  readonly appPath: string;
  readonly ssr: boolean;
  readonly router: boolean;
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
];

/* ---------------------------------------------------------------------------
 * File builders
 * --------------------------------------------------------------------------- */

function buildPackageJson(appPath: string): string {
  return `{
  "name": "${appPath}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "license": "GPL-3.0-only",
  "scripts": {
    "dev": "vite",
    "dev:express": "node --import tsx src/server/server.express.ts",
    "dev:bun": "bun src/server/server.bun.ts",
    "build": "bun run build:client",
    "build:all": "bun run build:client && bun run build:storybook",
    "build:client": "vite build --ssrManifest --outDir dist/client",
    "build:storybook": "storybook build",
    "check": "bun run check:biome && bun run check:ts",
    "check:fix": "bun run check:biome:fix && bun run check:ts",
    "check:biome": "biome check",
    "check:biome:fix": "biome check --write",
    "check:ts": "tsc --noEmit",
    "storybook": "storybook dev -p 6010 --no-open --host 0.0.0.0"
  },
  "dependencies": {
    "@canonical/react-head": "^0.25.0",
    "@canonical/react-ssr": "^0.25.0",
    "@canonical/router-core": "^0.25.0",
    "@canonical/router-react": "^0.25.0",
    "@canonical/styles": "^0.25.0",
    "express": "^5.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@biomejs/biome": "2.4.9",
    "@canonical/biome-config": "^0.25.0",
    "@canonical/typescript-config-react": "^0.25.0",
    "@types/express": "^5.0.6",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.0",
    "bun-types": "^1.3.9",
    "storybook": "^10.3.1",
    "tsx": "^4.19.0",
    "typescript": "^5.9.3",
    "vite": "^8.0.1",
    "vite-tsconfig-paths": "^6.1.1",
    "vitest": "^4.0.18"
  }
}
`;
}

function buildTsconfig(): string {
  return `{
  "extends": "@canonical/typescript-config-react",
  "compilerOptions": {
    "baseUrl": "src",
    "skipLibCheck": true,
    "types": ["bun-types", "node", "react", "react-dom", "vitest/globals"],
    "noEmit": true,
    "paths": {
      "#lib/*": ["./lib/*"],
      "#domains/*": ["./domains/*"],
      "#styles/*": ["./styles/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"]
}
`;
}

function buildViteConfig(): string {
  return `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
});
`;
}

function buildBiomeJson(): string {
  return `{
  "extends": ["@canonical/biome-config"],
  "files": {
    "includes": ["src", "*.json", "vite.config.ts"]
  }
}
`;
}

function buildIndexHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/entry.tsx"></script>
  </body>
</html>
`;
}

function buildStylesIndex(): string {
  return `@import url("@canonical/styles");
@import url("./app.css");
`;
}

function buildAppCss(): string {
  return `.app-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding-inline: var(--grid-gap, 1.5rem);
  padding-block: var(--container-gap-loose, 1.5rem);
}

.shell-header {
  padding-block-end: var(--container-gap-default, 1rem);
}

.shell-header nav {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--container-gap-default, 1rem);
}
`;
}

function buildClientEntry(): string {
  return `import { HeadProvider } from "@canonical/react-head";
import { createBrowserRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/index.css";

const router = createBrowserRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

hydrateRoot(
  document.getElementById("root")!,
  <HeadProvider>
    <RouterProvider router={router}>
      <Outlet fallback={<p>Loading\u2026</p>} />
    </RouterProvider>
  </HeadProvider>,
);
`;
}

function buildServerEntry(): string {
  return `import { HeadProvider } from "@canonical/react-head";
import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import { createStaticRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/app.css";

interface InitialData extends Record<string, unknown> {
  readonly url: string;
}

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const url = props.initialData?.url ?? "/";
  const router = createStaticRouter(appRoutes, url, {
    middleware: [...middleware],
    notFound: notFoundRoute,
  });

  return (
    <html lang={props.lang}>
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">
          <HeadProvider>
            <RouterProvider router={router}>
              <Outlet fallback={<p>Loading\u2026</p>} />
            </RouterProvider>
          </HeadProvider>
        </div>
      </body>
    </html>
  );
}

export type { InitialData };
`;
}

function buildServerExpress(): string {
  return `/**
 * Express development server with SSR and HMR.
 *
 * Vite handles client HMR and module transforms. Server modules are loaded
 * via vite.ssrLoadModule() \u2014 changes to routes, pages, or server code are
 * picked up without restarting the process.
 *
 * Production deployments use platform adapters (Vercel, Cloudflare, etc.),
 * not this server.
 */
import fs from "node:fs";
import * as process from "node:process";
import express from "express";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 5173;

async function start() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl || "/";

    try {
      const template = fs.readFileSync("index.html", "utf-8");
      const html = await vite.transformIndexHtml(url, template);

      const { default: EntryServer } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );
      const { JSXRenderer } = await vite.ssrLoadModule(
        "@canonical/react-ssr/renderer",
      );

      const renderer = new JSXRenderer(
        EntryServer,
        { url },
        { htmlString: html },
      );
      const result = renderer.renderToPipeableStream();

      await renderer.statusReady;
      res.status(renderer.statusCode);
      res.setHeader("content-type", "text/html; charset=utf-8");
      result.pipe(res);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });

  app.listen(PORT, () => {
    console.log(\`Express dev server on http://localhost:\${PORT}/\`);
  });
}

start();
`;
}

function buildServerBun(): string {
  return `/**
 * Bun development server with SSR and streaming.
 *
 * Uses Bun.serve() for the HTTP layer and Vite in middleware mode for
 * module transforms and client HMR. Server modules are loaded via
 * vite.ssrLoadModule() \u2014 changes are picked up without restart.
 *
 * Production deployments use platform adapters (Vercel, Cloudflare, etc.),
 * not this server.
 */
import fs from "node:fs";
import * as process from "node:process";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 5174;

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const requestUrl = url.pathname + url.search;

    try {
      const template = fs.readFileSync("index.html", "utf-8");
      const html = await vite.transformIndexHtml(requestUrl, template);

      const { default: EntryServer } = await vite.ssrLoadModule(
        "/src/server/entry.tsx",
      );
      const { JSXRenderer } = await vite.ssrLoadModule(
        "@canonical/react-ssr/renderer",
      );

      const renderer = new JSXRenderer(
        EntryServer,
        { url: requestUrl },
        { htmlString: html },
      );
      const stream = await renderer.renderToReadableStream(req.signal);

      return new Response(stream, {
        status: renderer.statusCode,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);

      return new Response("Internal server error", { status: 500 });
    }
  },
});

console.log(\`Bun dev server on http://localhost:\${PORT}/\`);
`;
}

function buildHomePage(): string {
  return `import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function HomePage(): ReactElement {
  useHead({ title: "Home" });

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title">Home</h1>
      <p>Welcome to your new application.</p>
    </section>
  );
}
`;
}

function buildMarketingRoutes(): string {
  return `import { route } from "@canonical/router-core";
import HomePage from "./HomePage.js";

const routes = {
  home: route({
    url: "/",
    content: HomePage,
  }),
} as const;

export default routes;
`;
}

function buildAppRoutes(): string {
  return `import { group, route, wrapper } from "@canonical/router-core";
import type { ReactElement, ReactNode } from "react";
import marketingRoutes from "#domains/marketing/routes.js";
import Navigation from "#lib/Navigation/index.js";

const publicLayout = wrapper<ReactElement>({
  id: "public-layout",
  component: ({ children }: { children: ReactNode }) => (
    <div className="subgrid app-shell">
      <header className="subgrid shell-header">
        <Navigation />
      </header>
      <main className="subgrid">{children}</main>
    </div>
  ),
});

const notFoundRoute = route({
  url: "/not-found",
  content: () => (
    <section>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
    </section>
  ),
});

const [home] = group(publicLayout, [marketingRoutes.home] as const);

const appRoutes = {
  home,
} as const;

export type AppRoutes = typeof appRoutes;

declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: AppRoutes;
  }
}

export const middleware: readonly [] = [] as const;

export { appRoutes, notFoundRoute };
`;
}

function buildNavigation(): string {
  return `import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";

export default function Navigation(): ReactElement {
  return (
    <nav aria-label="Main">
      <Link to="home">Home</Link>
    </nav>
  );
}
`;
}

function buildNavigationBarrel(): string {
  return `export { default } from "./Navigation.js";
`;
}

/* ---------------------------------------------------------------------------
 * Generator
 * --------------------------------------------------------------------------- */

export const generator: GeneratorDefinition<ApplicationReactAnswers> = {
  meta: {
    name: "application/react",
    displayName: "@canonical/summon-application:application/react",
    description: "Scaffold a complete React application with SSR and routing",
    version: "0.1.0",
    help: `Creates a full React application with:
  - Vite build + dev server
  - Server-side rendering (Express + Bun dev servers)
  - File-based routing with @canonical/router-core
  - A marketing domain with a home page
  - Navigation component
  - Biome + TypeScript configuration

Requires both --ssr and --router flags.`,
    examples: [
      "summon application/react my-app",
      "summon application/react --ssr --router my-app",
    ],
  },

  prompts,

  generate: (answers) => {
    const appPath = normalizeCommandPath(answers.appPath || "my-app");

    if (!answers.ssr || !answers.router) {
      throw new Error(
        "The application/react generator requires both --ssr and --router. " +
          "Standalone SPA mode is not yet supported.",
      );
    }

    const p = (...segments: string[]) => path.join(appPath, ...segments);

    return sequence_([
      info(`Scaffolding React application in "${appPath}"...`),

      // Create directory structure
      mkdir(p()),
      mkdir(p("src")),
      mkdir(p("src", "client")),
      mkdir(p("src", "server")),
      mkdir(p("src", "styles")),
      mkdir(p("src", "domains", "marketing")),
      mkdir(p("src", "lib", "Navigation")),

      // Root config files
      writeFile(p("package.json"), buildPackageJson(appPath)),
      writeFile(p("tsconfig.json"), buildTsconfig()),
      writeFile(p("vite.config.ts"), buildViteConfig()),
      writeFile(p("biome.json"), buildBiomeJson()),
      writeFile(p("index.html"), buildIndexHtml()),

      // Styles
      writeFile(p("src", "styles", "index.css"), buildStylesIndex()),
      writeFile(p("src", "styles", "app.css"), buildAppCss()),

      // Client entry
      writeFile(p("src", "client", "entry.tsx"), buildClientEntry()),

      // Server entries
      writeFile(p("src", "server", "entry.tsx"), buildServerEntry()),
      writeFile(p("src", "server", "server.express.ts"), buildServerExpress()),
      writeFile(p("src", "server", "server.bun.ts"), buildServerBun()),

      // Domain: marketing
      writeFile(
        p("src", "domains", "marketing", "HomePage.tsx"),
        buildHomePage(),
      ),
      writeFile(
        p("src", "domains", "marketing", "routes.ts"),
        buildMarketingRoutes(),
      ),

      // App routes
      writeFile(p("src", "routes.tsx"), buildAppRoutes()),

      // Navigation component
      writeFile(
        p("src", "lib", "Navigation", "Navigation.tsx"),
        buildNavigation(),
      ),
      writeFile(
        p("src", "lib", "Navigation", "index.ts"),
        buildNavigationBarrel(),
      ),

      info(
        `Application "${appPath}" created. Run \`cd ${appPath} && bun install && bun run dev\` to start.`,
      ),
    ]);
  },
};

export default generator;
