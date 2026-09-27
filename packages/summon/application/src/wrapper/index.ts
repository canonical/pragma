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
import { toKebabCase, toPascalCase } from "@canonical/utils";
import { normalizeCommandPath } from "../shared/casing.js";
import { packageVersion } from "../shared/packageVersion.js";
import { renderTemplate } from "../shared/renderTemplate.js";
import { validateCommandPath } from "../shared/validators.js";

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
    validate: validateCommandPath({
      label: "Wrapper name",
      maxSegments: 1,
      example: "settings",
    }),
    group: "Wrapper",
  },
];

/** The wrapper generator's own templates, copied next to it by the build. */
const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "templates",
);

export const generator: GeneratorDefinition<WrapperAnswers> = {
  meta: {
    name: "wrapper",
    displayName: "@canonical/summon-application:wrapper",
    description: "Create a layout wrapper component",
    version: packageVersion(),
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
      writeFile(
        path.join(layoutDir, `${layoutName}.tsx`),
        renderTemplate(templatesDir, "Layout.tsx.ejs", {
          layoutName,
          className: `${toKebabCase(name)}-layout`,
        }),
      ),
      writeFile(
        path.join(layoutDir, "index.ts"),
        renderTemplate(templatesDir, "index.ts.ejs", { layoutName }),
      ),
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
