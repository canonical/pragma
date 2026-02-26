/**
 * Package Generator
 *
 * Generates a new npm package with proper configuration for the pragma monorepo.
 * Uses a decision-tree prompt flow: content → framework → isComponentLibrary → withCli.
 */

import {
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
  detectPackageManager,
  getPackageShortName,
  type PackageAnswers,
  validatePackageName,
} from "../shared/index.js";
import { fetchSourceVersions } from "../shared/versions.js";
import { collectManifest } from "./files.js";

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
    message: "What does the package contain?",
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
      { label: "None", value: "none" },
      { label: "React", value: "react" },
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

export const generator: GeneratorDefinition<PackageAnswers> = {
  meta: {
    name: "package",
    description:
      "Generate a new npm package with proper configuration for the pragma monorepo",
    version: "0.2.0",
    help: `Generate a new npm package using a decision-tree prompt flow.

CONTENT:
  typescript   TypeScript package (default)
  css          CSS-only package (stylesheets, tokens)

FRAMEWORK (TypeScript only):
  none         No web framework (default)
  react        React

ARCHITECTURE (auto-derived from answers):
  UI components → Storybook auto-included, builds to dist/
  CLI package   → No build, GPL-3.0, runs from src/
  Library       → Builds to dist/, LGPL-3.0

The generator auto-detects:
  - Monorepo: Uses lerna.json version when in pragma monorepo
  - Framework version: React packages follow @canonical/react-ds-global version
  - Package manager: Detects bun/yarn/pnpm (defaults to bun)`,
    examples: [
      "summon package --name=@canonical/my-tool --content=typescript --with-cli",
      "summon package --name=@canonical/my-lib --content=typescript",
      "summon package --name=@canonical/my-react-lib --content=typescript --framework=react --is-component-library",
      "summon package --name=my-styles --content=css",
      "summon package --name=@canonical/my-hooks --content=typescript --framework=react --no-is-component-library",
    ],
  },

  prompts,

  generate: (answers) => {
    const packageDir = getPackageShortName(answers.name);
    const cwd = process.cwd();
    const isTS = answers.content !== "css";

    return flatMap(detectMonorepo(cwd), (monorepoInfo) =>
      flatMap(
        detectFrameworkVersion(cwd, answers.framework, monorepoInfo),
        (version) => {
          const ctx = createTemplateContext(
            answers,
            version,
            monorepoInfo.version,
          );

          return flatMap(fetchSourceVersions(answers.framework), (versions) => {
            const manifest = collectManifest(ctx, packageDir, versions);

            return sequence_([
              // Info
              info(`Creating package: ${answers.name}`),
              info(`Content: ${answers.content}`),
              when(isTS, info(`Framework: ${answers.framework}`)),
              when(
                monorepoInfo.isMonorepo,
                info(`Monorepo detected, using version: ${version}`),
              ),

              // Directories
              ...manifest.dirs.map((d) => mkdir(d)),

              // Programmatic files
              ...manifest.files.map((f) => writeFile(f.path, f.content)),

              // EJS templates
              ...manifest.templates.map((t) =>
                template({
                  source: t.templatePath,
                  dest: t.destPath,
                  vars: ctx,
                }),
              ),

              info(`Package created at ./${packageDir}`),

              // Run install (conditional)
              when(
                answers.runInstall,
                flatMap(detectPackageManager(cwd), (pm) =>
                  sequence_([
                    info(`Running ${pm} install...`),
                    flatMap(exec(pm, ["install"], packageDir), () =>
                      info("Dependencies installed successfully"),
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
