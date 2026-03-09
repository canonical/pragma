/**
 * Package Generator
 *
 * Generates a new npm package with proper configuration for the pragma monorepo.
 * Uses a decision-tree prompt flow: content → framework → isComponentLibrary → withCli.
 */

import {
  detectPackageManager,
  exec,
  flatMap,
  type GeneratorDefinition,
  info,
  mkdir,
  type PromptDefinition,
  sequence_,
  template,
  when,
  writeFile,
} from "@canonical/summon";

import {
  createTemplateContext,
  detectFrameworkVersion,
  detectMonorepo,
  getPackageShortName,
  type PackageAnswers,
  validatePackageName,
} from "../shared/index.js";
import { fetchSourceVersions } from "../shared/versions.js";
import { collectManifest } from "./files.js";
import { meta } from "./meta.js";

// =============================================================================
// Prompts
// =============================================================================

const prompts: PromptDefinition[] = [
  {
    name: "name",
    type: "text",
    message: "Package name:",
    default: "@canonical/my-package",
    validate: validatePackageName,
    group: "Package",
  },
  {
    name: "description",
    type: "text",
    message: "Package description:",
    default: "",
    group: "Package",
  },
  {
    name: "content",
    type: "select",
    message: "What would you like to publish?",
    choices: [
      { label: "TypeScript", value: "typescript" },
      { label: "CSS only (stylesheets, tokens)", value: "css" },
    ],
    default: "typescript",
    group: "Package",
  },
  {
    name: "framework",
    type: "select",
    message: "Does it use a web framework?",
    choices: [
      { label: "React", value: "react" },
      { label: "None", value: "none" },
    ],
    default: "none",
    when: (answers) => answers.content === "typescript",
    group: "Architecture",
  },
  {
    name: "isComponentLibrary",
    type: "confirm",
    message: "Does it export UI components?",
    default: true,
    when: (answers) =>
      answers.content === "typescript" &&
      answers.framework !== undefined &&
      answers.framework !== "none",
    group: "Architecture",
  },
  {
    name: "withCli",
    type: "confirm",
    message: "Does it have a CLI entry point?",
    default: false,
    when: (answers) =>
      answers.content === "typescript" && !answers.isComponentLibrary,
    group: "Architecture",
  },
  {
    name: "runInstall",
    type: "confirm",
    message: "Run package manager install after creation?",
    default: true,
    group: "Post-setup",
  },
];

// =============================================================================
// Generator Definition
// =============================================================================

const generator: GeneratorDefinition<PackageAnswers> = {
  meta,

  prompts,

  generate: (answers) => {
    const packageDir = getPackageShortName(answers.name);
    const currentDirectory = process.cwd();
    const isTypeScript = answers.content !== "css";

    return flatMap(detectMonorepo(currentDirectory), (monorepoInfo) =>
      flatMap(
        detectFrameworkVersion(
          currentDirectory,
          answers.framework,
          monorepoInfo,
        ),
        (version) => {
          const context = createTemplateContext(
            answers,
            version,
            monorepoInfo.version,
          );

          return flatMap(fetchSourceVersions(answers.framework), (versions) => {
            const manifest = collectManifest(context, packageDir, versions);

            return sequence_([
              // Info
              info(`Creating package: ${answers.name}`),
              info(`Content: ${answers.content}`),
              when(isTypeScript, info(`Framework: ${answers.framework}`)),
              when(
                monorepoInfo.isMonorepo,
                info(`Monorepo detected, using version: ${version}`),
              ),

              // Directories
              ...manifest.dirs.map((directory) => mkdir(directory)),

              // Programmatic files
              ...manifest.files.map((file) =>
                writeFile(file.path, file.content),
              ),

              // EJS templates
              ...manifest.templates.map((templateFile) =>
                template({
                  source: templateFile.templatePath,
                  dest: templateFile.destPath,
                  vars: context,
                }),
              ),

              info(`Package created at ./${packageDir}`),

              // Run install (conditional)
              when(
                answers.runInstall,
                flatMap(
                  detectPackageManager(currentDirectory),
                  (packageManager) =>
                    sequence_([
                      info(`Running ${packageManager} install...`),
                      flatMap(
                        exec(packageManager, ["install"], packageDir),
                        () => info("Dependencies installed successfully"),
                      ),
                    ]),
                ),
              ),
              when(!answers.runInstall, info("Skipping install step")),

              info(""),
              info("Next steps:"),
              info(`  cd ${packageDir}`),
              info("  bun run check"),
              info(""),
            ]);
          });
        },
      ),
    );
  },
};

export default generator;
