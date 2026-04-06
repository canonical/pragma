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

interface WrapperAnswers {
  readonly wrapperPath: string;
}

const prompts: PromptDefinition[] = [
  {
    name: "wrapperPath",
    type: "text",
    message: "Wrapper path (for example settings):",
    default: "settings",
    positional: true,
    group: "Wrapper",
  },
];

function buildWrapperFile(wrapperPath: string): string {
  const normalized = normalizeCommandPath(wrapperPath);
  const variableName = `${toCamelCase(normalized)}Wrapper`;
  const title = toTitleCase(normalized);

  return `import { wrapper } from "@canonical/router-core";
import type { ReactElement, ReactNode } from "react";

export const ${variableName} = wrapper<void, ReactElement>({
  id: "${normalized}",
  component: ({ children }): ReactElement => {
    return (
      <section className="route-panel stack" aria-labelledby="${variableName}-title">
        <p className="eyebrow">Generated wrapper</p>
        <h1 id="${variableName}-title">${title}</h1>
        <div>{children as ReactNode}</div>
      </section>
    );
  },
});

export default ${variableName};
`;
}

export const generator: GeneratorDefinition<WrapperAnswers> = {
  meta: {
    name: "wrapper",
    displayName: `${pkg.name}:wrapper`,
    description: "Generate a wrapper module under src/wrappers/",
    version: "0.1.0",
    help: `Generate a wrapper module.

EXAMPLE:
  summon wrapper settings

OUTPUT:
  src/wrappers/settings.tsx
`,
    examples: [
      "summon wrapper settings",
      "summon wrapper account-shell",
    ],
  },
  prompts,
  generate: (answers: WrapperAnswers) => {
    const normalized = normalizeCommandPath(answers.wrapperPath);
    const dirname = path.join("src", "wrappers", path.dirname(normalized));
    const filename = path.join("src", "wrappers", `${normalized}.tsx`);
    const exportLine = `export { default as ${toCamelCase(normalized)}Wrapper } from "./${normalized}.js";\n`;

    return sequence_([
      info(`Generating wrapper: ${normalized}`),
      mkdir(dirname),
      writeFile(filename, buildWrapperFile(normalized)),
      appendFile(path.join("src", "wrappers", "index.tsx"), exportLine),
    ]);
  },
};

export default generator;
