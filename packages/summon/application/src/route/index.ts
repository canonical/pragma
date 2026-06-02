import * as path from "node:path";
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
  - Inserts the import + route entry into src/domains/<domain>/routes.ts

Refuses to overwrite an existing page file.

Create the domain first with: summon domain <name>

Note on --undo: undo removes the route entry and import it added. It assumes the
route was newly created — running --undo after an insert that was a no-op (the
route key already existed) would remove a route you already had.`,
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
    const pageFile = path.join(domainDir, `${pageName}.tsx`);
    const routesFile = path.join(domainDir, "routes.ts");
    const url = `/${normalized}`;
    const routeKey = toCamelCase(routeName);

    const scaffold = sequence_([
      info(`Adding route "${routeName}" to domain "${domainName}"...`),
      mkdir(domainDir),
      writeFile(pageFile, buildPage(routeName)),
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

    // Refuse to overwrite an existing page — the page write's default undo is
    // a delete, so overwriting a hand-authored page then `--undo` would destroy
    // the original (there is no snapshot). Bail out before touching anything.
    return flatMap(exists(pageFile), (present) =>
      present
        ? fail({
            code: "ROUTE_PAGE_EXISTS",
            message: `Page "${pageFile}" already exists. Choose a different route name or remove the file first.`,
          })
        : scaffold,
    );
  },
};

export default generator;
