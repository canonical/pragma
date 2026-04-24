import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { template, withHelpers } from "@canonical/summon-core";
import { copyFile, info, sequence_ } from "@canonical/task";
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
  - A marketing domain with a home page
  - Navigation component with typed Link
  - Storybook with router decorator
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

    /** Copy a static file from templates/ to the app directory. */
    const copy = (filePath: string) => copyFile(src(filePath), dest(filePath));

    return sequence_([
      info(`Scaffolding React application in "${appPath}"...`),

      // EJS templates (files that need interpolation)
      template({
        source: src("package.json.ejs"),
        dest: dest("package.json"),
        vars,
      }),
      template({ source: src("README.md.ejs"), dest: dest("README.md"), vars }),

      // Static files (copied as-is)
      copy("tsconfig.json"),
      copy("vite.config.ts"),
      template({
        source: src("biome.json.ejs"),
        dest: dest("biome.json"),
        vars,
      }),
      copy("index.html"),
      copy(".gitignore"),

      // Styles
      copy("src/styles/index.css"),
      copy("src/styles/app.css"),

      // Client
      copy("src/client/entry.tsx"),

      // Server
      copy("src/server/entry.tsx"),
      copy("src/server/server.express.ts"),
      copy("src/server/server.bun.ts"),
      copy("src/server/sitemap.ts"),

      // Domain: marketing
      copy("src/domains/marketing/HomePage.tsx"),
      copy("src/domains/marketing/routes.ts"),

      // Routes
      copy("src/routes.tsx"),

      // Lib
      copy("src/lib/index.ts"),
      copy("src/lib/Navigation/Navigation.tsx"),
      copy("src/lib/Navigation/index.ts"),

      // Vite types
      copy("src/vite-env.d.ts"),

      // Storybook
      copy(".storybook/main.ts"),
      copy(".storybook/preview.ts"),
      copy(".storybook/decorators/withRouter.tsx"),
      copy(".storybook/decorators/index.ts"),

      info(
        `Application "${appPath}" created. Run \`cd ${appPath} && bun install && bun run dev\` to start.`,
      ),
    ]);
  },
};

export default generator;
