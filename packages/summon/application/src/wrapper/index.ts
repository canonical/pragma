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
  writeFile,
} from "@canonical/task";
import { toKebabCase, toPascalCase } from "@canonical/utils";
import { normalizeCommandPath } from "../shared/casing.js";

export interface WrapperAnswers {
  readonly wrapperName: string;
}

const prompts: PromptDefinition[] = [
  {
    name: "wrapperName",
    type: "text",
    message: "Wrapper name (for example settings):",
    default: "example",
    positional: true,
    group: "Wrapper",
  },
];

function buildLayout(wrapperName: string): string {
  const layoutName = `${toPascalCase(wrapperName)}Layout`;
  const className = `${toKebabCase(wrapperName)}-layout`;

  return `import type { ReactNode, ReactElement } from "react";

export default function ${layoutName}({
  children,
}: { children: ReactNode }): ReactElement {
  return <div className="${className}">{children}</div>;
}
`;
}

function buildBarrel(wrapperName: string): string {
  const layoutName = `${toPascalCase(wrapperName)}Layout`;

  return `export { default } from "./${layoutName}.js";
`;
}

export const generator: GeneratorDefinition<WrapperAnswers> = {
  meta: {
    name: "wrapper",
    displayName: "@canonical/summon-application:wrapper",
    description: "Create a layout wrapper component",
    version: "0.1.0",
    help: `Creates a layout wrapper component under src/lib/.

Given a name like "settings", creates:
  - src/lib/SettingsLayout/SettingsLayout.tsx
  - src/lib/SettingsLayout/index.ts (barrel export)`,
    examples: [
      "summon wrapper settings",
      "summon wrapper sidebar",
      "summon wrapper --dry-run dashboard",
    ],
  },

  prompts,

  generate: (answers) => {
    const name = normalizeCommandPath(answers.wrapperName);
    const layoutName = `${toPascalCase(name)}Layout`;
    const layoutDir = path.join("src", "lib", layoutName);

    const scaffold = sequence_([
      info(`Creating wrapper "${layoutName}"...`),
      mkdir(layoutDir),
      writeFile(path.join(layoutDir, `${layoutName}.tsx`), buildLayout(name)),
      writeFile(path.join(layoutDir, "index.ts"), buildBarrel(name)),
      info(`Wrapper "${layoutName}" created at ${layoutDir}.`),
    ]);

    // Refuse to run when the layout already exists — mkdir/writeFile undos are
    // destructive, so overwriting then `--undo` could delete a pre-existing one.
    return flatMap(exists(layoutDir), (present) =>
      present
        ? fail({
            code: "WRAPPER_EXISTS",
            message: `Wrapper "${layoutDir}" already exists. Choose a different name or remove it first.`,
          })
        : scaffold,
    );
  },
};

export default generator;
