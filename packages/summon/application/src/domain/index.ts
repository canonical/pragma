import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import {
  exists,
  fail,
  flatMap,
  info,
  mkdir,
  sequence_,
  writeFile,
} from "@canonical/task";
import { toCamelCase, toTitleCase } from "@canonical/utils";
import { normalizeCommandPath } from "../shared/casing.js";
import { packageVersion } from "../shared/packageVersion.js";
import { renderTemplate } from "../shared/renderTemplate.js";
import { validateCommandPath } from "../shared/validators.js";
import { printVersions } from "../shared/versions.js";

export interface DomainAnswers {
  readonly domainName: string;
}

const prompts: PromptDefinition[] = [
  {
    name: "domainName",
    type: "text",
    message: "Domain name (for example billing):",
    default: "example",
    positional: true,
    validate: validateCommandPath({
      label: "Domain name",
      maxSegments: 1,
      example: "billing",
    }),
    group: "Domain",
  },
];

/** The domain generator's own templates, copied next to it by the build. */
const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "templates",
);

export const generator: GeneratorDefinition<DomainAnswers> = {
  meta: {
    name: "domain",
    displayName: "@canonical/summon-application:domain",
    description: "Create a domain folder with routes and a MainPage",
    version: packageVersion(),
    help: `Creates a domain directory under src/domains/ with:
  - MainPage.tsx — example page component with <Head>
  - routes.ts — route barrel exporting the domain's routes

Add more pages with: summon page <domain>/<name>`,
    examples: [
      "summon domain billing",
      "summon domain user-settings",
      "summon domain --dry-run billing",
    ],
  },

  prompts,

  generate: (answers) => {
    const name = normalizeCommandPath(answers.domainName);
    const domainDir = path.join("src", "domains", name);

    const scaffold = sequence_([
      printVersions("domain"),
      info(`Creating domain "${name}"...`),
      mkdir(domainDir),
      writeFile(
        path.join(domainDir, "MainPage.tsx"),
        renderTemplate(templatesDir, "MainPage.tsx.ejs", {
          title: toTitleCase(name),
          domainName: name,
        }),
      ),
      writeFile(
        path.join(domainDir, "routes.ts"),
        renderTemplate(templatesDir, "routes.ts.ejs", {
          routeKey: toCamelCase(name),
          routeUrl: `/${name}`,
        }),
      ),
      info(
        `Domain "${name}" created. Import its routes in src/routes.tsx and wire them with group().`,
      ),
    ]);

    // Refuse to run when the domain already exists — mkdir/writeFile undos are
    // destructive (DeleteDirectory / DeleteFile), so overwriting then `--undo`
    // could delete a pre-existing domain.
    return flatMap(exists(domainDir), (present) =>
      present
        ? fail({
            code: "DOMAIN_EXISTS",
            message: `Domain "${domainDir}" already exists. Choose a different name or remove it first.`,
          })
        : scaffold,
    );
  },
};

export default generator;
