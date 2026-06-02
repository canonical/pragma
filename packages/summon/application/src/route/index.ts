import * as path from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import {
  info,
  mkdir,
  sequence_,
  transformFile,
  writeFile,
} from "@canonical/task";
import { toCamelCase, toPascalCase, toTitleCase } from "@canonical/utils";
import { normalizeCommandPath } from "../shared/casing.js";
import { insertRoute, removeRoute } from "./insertRoute.js";

interface RouteAnswers {
  readonly routePath: string;
}

const prompts: PromptDefinition[] = [
  {
    name: "routePath",
    type: "text",
    message: "Route path (for example account/settings):",
    default: "example/page",
    positional: true,
    group: "Route",
  },
];

function buildPage(routeName: string): string {
  const pageName = `${toPascalCase(routeName)}Page`;
  const title = toTitleCase(routeName);
  const slugId = toCamelCase(routeName);

  return `import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function ${pageName}(): ReactElement {
  useHead({ title: "${title}" });

  return (
    <section aria-labelledby="${slugId}-title">
      <h1 id="${slugId}-title">${title}</h1>
    </section>
  );
}
`;
}

export const generator: GeneratorDefinition<RouteAnswers> = {
  meta: {
    name: "route",
    displayName: "@canonical/summon-application:route",
    description: "Add a route page to an existing domain",
    version: "0.1.0",
    help: `Creates a page component inside an existing domain directory.

Given a path like "account/settings":
  - Domain = first segment ("account")
  - Route  = last segment ("settings")

Creates:
  - src/domains/<domain>/<RouteName>Page.tsx
  - Appends import + route entry to src/domains/<domain>/routes.ts

Create the domain first with: summon domain <name>`,
    examples: [
      "summon route account/settings",
      "summon route billing/invoices",
      "summon route --dry-run user/profile",
    ],
  },

  prompts,

  generate: (answers) => {
    const normalized = normalizeCommandPath(answers.routePath);
    const segments = normalized.split("/");

    if (segments.length < 2) {
      throw new Error(
        `Route path must include a domain and route name (e.g. "account/settings"), got "${normalized}"`,
      );
    }

    const domainName = segments[0];
    const routeName = segments[segments.length - 1];
    const pageName = `${toPascalCase(routeName)}Page`;
    const domainDir = path.join("src", "domains", domainName);
    const routesFile = path.join(domainDir, "routes.ts");
    const url = `/${normalized}`;
    const routeKey = toCamelCase(routeName);

    return sequence_([
      info(`Adding route "${routeName}" to domain "${domainName}"...`),
      mkdir(domainDir),
      writeFile(path.join(domainDir, `${pageName}.tsx`), buildPage(routeName)),
      // Insert the import + route entry into the domain's routes object via a
      // pure AST-located transform (no manual edit needed afterwards). Undo
      // removes exactly the lines we added, rather than restoring a snapshot.
      transformFile(
        routesFile,
        (source) =>
          insertRoute(source, {
            pageName,
            importPath: `./${pageName}.js`,
            routeKey,
            url,
          }),
        {
          undo: transformFile(routesFile, (source) =>
            removeRoute(source, { pageName, routeKey }),
          ),
        },
      ),
      info(`Route "${routeName}" wired into ${routesFile}.`),
    ]);
  },
};

export default generator;
