import * as path from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { info, mkdir, sequence_, writeFile } from "@canonical/task";
import { toPascalCase, toTitleCase } from "@canonical/utils";
import { normalizeCommandPath } from "../shared/casing.js";

interface DomainAnswers {
  readonly domainName: string;
}

const prompts: PromptDefinition[] = [
  {
    name: "domainName",
    type: "text",
    message: "Domain name (for example billing):",
    default: "example",
    positional: true,
    group: "Domain",
  },
];

function buildMainPage(domainName: string): string {
  const title = toTitleCase(domainName);

  return `import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function MainPage(): ReactElement {
  useHead({ title: "${title}" });

  return (
    <section aria-labelledby="main-title">
      <h1 id="main-title">${title}</h1>
      <p>This is the main page for the ${domainName} domain.</p>
    </section>
  );
}
`;
}

function buildRoutesFile(domainName: string): string {
  const routeUrl = `/${normalizeCommandPath(domainName)}`;

  return `import { route } from "@canonical/router-core";
import MainPage from "./MainPage.js";

const routes = {
  ${toPascalCase(domainName).charAt(0).toLowerCase() + toPascalCase(domainName).slice(1)}: route({
    url: "${routeUrl}",
    content: MainPage,
  }),
} as const;

export default routes;
`;
}

export const generator: GeneratorDefinition<DomainAnswers> = {
  meta: {
    name: "domain",
    displayName: "@canonical/summon-application:domain",
    description: "Create a domain folder with routes and a MainPage",
    version: "0.1.0",
    help: `Creates a domain directory under src/domains/ with:
  - MainPage.tsx — example page component with useHead()
  - routes.ts — route barrel exporting the domain's routes

Add more routes with: summon route <domain>/<route-name>`,
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

    return sequence_([
      info(`Creating domain "${name}"...`),
      mkdir(domainDir),
      writeFile(path.join(domainDir, "MainPage.tsx"), buildMainPage(name)),
      writeFile(path.join(domainDir, "routes.ts"), buildRoutesFile(name)),
      info(
        `Domain "${name}" created. Import its routes in src/routes.tsx and wire them with group().`,
      ),
    ]);
  },
};

export default generator;
