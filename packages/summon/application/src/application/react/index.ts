import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { template, withHelpers } from "@canonical/summon-core";
import { info, sequence_ } from "@canonical/task";
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
 * Template paths
 * --------------------------------------------------------------------------- */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "templates");

const t = (templatePath: string) => path.join(templatesDir, templatePath);

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

    const vars = withHelpers({ name: appPath });
    const dest = (...segments: string[]) => path.join(appPath, ...segments);

    return sequence_([
      info(`Scaffolding React application in "${appPath}"...`),

      // Root config files
      template({
        source: t("package.json.ejs"),
        dest: dest("package.json"),
        vars,
      }),
      template({
        source: t("tsconfig.json.ejs"),
        dest: dest("tsconfig.json"),
        vars,
      }),
      template({
        source: t("vite.config.ts.ejs"),
        dest: dest("vite.config.ts"),
        vars,
      }),
      template({
        source: t("biome.json.ejs"),
        dest: dest("biome.json"),
        vars,
      }),
      template({
        source: t("index.html.ejs"),
        dest: dest("index.html"),
        vars,
      }),

      // Styles
      template({
        source: t("src/styles/index.css.ejs"),
        dest: dest("src", "styles", "index.css"),
        vars,
      }),
      template({
        source: t("src/styles/app.css.ejs"),
        dest: dest("src", "styles", "app.css"),
        vars,
      }),

      // Client entry
      template({
        source: t("src/client/entry.tsx.ejs"),
        dest: dest("src", "client", "entry.tsx"),
        vars,
      }),

      // Server entries
      template({
        source: t("src/server/entry.tsx.ejs"),
        dest: dest("src", "server", "entry.tsx"),
        vars,
      }),
      template({
        source: t("src/server/server.express.ts.ejs"),
        dest: dest("src", "server", "server.express.ts"),
        vars,
      }),
      template({
        source: t("src/server/server.bun.ts.ejs"),
        dest: dest("src", "server", "server.bun.ts"),
        vars,
      }),
      template({
        source: t("src/server/sitemap.ts.ejs"),
        dest: dest("src", "server", "sitemap.ts"),
        vars,
      }),

      // Domain: marketing
      template({
        source: t("src/domains/marketing/HomePage.tsx.ejs"),
        dest: dest("src", "domains", "marketing", "HomePage.tsx"),
        vars,
      }),
      template({
        source: t("src/domains/marketing/routes.ts.ejs"),
        dest: dest("src", "domains", "marketing", "routes.ts"),
        vars,
      }),

      // App routes
      template({
        source: t("src/routes.tsx.ejs"),
        dest: dest("src", "routes.tsx"),
        vars,
      }),

      // Navigation component
      template({
        source: t("src/lib/Navigation/Navigation.tsx.ejs"),
        dest: dest("src", "lib", "Navigation", "Navigation.tsx"),
        vars,
      }),
      template({
        source: t("src/lib/Navigation/index.ts.ejs"),
        dest: dest("src", "lib", "Navigation", "index.ts"),
        vars,
      }),

      // Lib barrel
      template({
        source: t("src/lib/index.ts.ejs"),
        dest: dest("src", "lib", "index.ts"),
        vars,
      }),

      info(
        `Application "${appPath}" created. Run \`cd ${appPath} && bun install && bun run dev\` to start.`,
      ),
    ]);
  },
};

export default generator;
