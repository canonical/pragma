import * as path from "node:path";
import type { GeneratorDefinition, PromptDefinition } from "../../../core/src/index.js";
import {
  appendFile,
  info,
  mkdir,
  sequence_,
  writeFile,
} from "../../../../runtime/task/src/index.js";
import pkg from "../../package.json" with { type: "json" };
import { normalizeCommandPath, toCamelCase, toTitleCase } from "../shared/casing.js";

interface RouteAnswers {
  readonly routePath: string;
}

const prompts: PromptDefinition[] = [
  {
    name: "routePath",
    type: "text",
    message: "Route path (for example settings/billing):",
    default: "settings/billing",
    positional: true,
    group: "Route",
  },
];

function buildRouteFile(routePath: string): string {
  const normalized = normalizeCommandPath(routePath);
  const segments = normalized.split("/");
  const routeUrl = `/${normalized}`;
  const variableName = `${toCamelCase(segments.join("-"))}Route`;
  const title = toTitleCase(segments.join(" "));

  return `import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

const ${variableName} = route({
  url: "${routeUrl}",
  content: (): ReactElement => {
    return (
      <section className="route-panel stack" aria-labelledby="${variableName}-title">
        <p className="eyebrow">Generated route</p>
        <h1 id="${variableName}-title">${title}</h1>
        <p className="lede">
          Replace this placeholder content with your real route implementation.
        </p>
      </section>
    );
  },
});

export default ${variableName};
`;
}

export const generator: GeneratorDefinition<RouteAnswers> = {
  meta: {
    name: "route",
    displayName: `${pkg.name}:route`,
    description: "Generate a route module under src/routes/",
    version: "0.1.0",
    help: `Generate a route module.

EXAMPLE:
  summon route settings/billing

OUTPUT:
  src/routes/settings/billing.tsx
`,
    examples: [
      "summon route settings/billing",
      "summon route account/preferences",
    ],
  },
  prompts,
  generate: (answers: RouteAnswers) => {
    const normalized = normalizeCommandPath(answers.routePath);
    const dirname = path.join("src", "routes", path.dirname(normalized));
    const filename = path.join("src", "routes", `${normalized}.tsx`);
    const exportLine = `export { default as ${toCamelCase(normalized)}Route } from "./${normalized}.js";\n`;

    return sequence_([
      info(`Generating route: ${normalized}`),
      mkdir(dirname),
      writeFile(filename, buildRouteFile(normalized)),
      appendFile(path.join("src", "routes", "index.tsx"), exportLine),
    ]);
  },
};

export default generator;
