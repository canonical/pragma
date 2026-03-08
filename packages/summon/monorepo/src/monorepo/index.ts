/**
 * Monorepo Generator
 *
 * Generates a new Bun + Lerna monorepo with CI, release workflows,
 * and shared configuration. Does NOT create an initial package —
 * use summon-package for that.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
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
  type MonorepoAnswers,
  validateMonorepoName,
  validateRepository,
} from "../shared/index.js";

// =============================================================================
// Template Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const templates = {
  packageJson: path.join(templatesDir, "package.json.ejs"),
  lernaJson: path.join(templatesDir, "lerna.json.ejs"),
  nxJson: path.join(templatesDir, "nx.json.ejs"),
  tsconfigJson: path.join(templatesDir, "tsconfig.json.ejs"),
  biomeJson: path.join(templatesDir, "biome.json.ejs"),
  gitignore: path.join(templatesDir, "gitignore.ejs"),
  readme: path.join(templatesDir, "README.md.ejs"),
  license: path.join(templatesDir, "LICENSE.ejs"),
  publishStatus: path.join(templatesDir, "publish-status.ts.ejs"),
  ciYml: path.join(templatesDir, "ci.yml.ejs"),
  prLintYml: path.join(templatesDir, "pr-lint.yml.ejs"),
  tagYml: path.join(templatesDir, "tag.yml.ejs"),
  prTemplate: path.join(templatesDir, "PULL_REQUEST_TEMPLATE.md.ejs"),
  setupEnv: path.join(templatesDir, "setup-env.yml.ejs"),
  setupGit: path.join(templatesDir, "setup-git.yml.ejs"),
  lernaVersionAction: path.join(templatesDir, "lerna-version-action.yml.ejs"),
  versionSh: path.join(templatesDir, "version.sh.ejs"),
  gitCommitSh: path.join(templatesDir, "git-commit.sh.ejs"),
  renovateJson: path.join(templatesDir, "renovate.json.ejs"),
};

// =============================================================================
// Prompts
// =============================================================================

const prompts: PromptDefinition[] = [
  {
    name: "name",
    type: "text",
    message: "Monorepo name:",
    default: "my-monorepo",
    validate: validateMonorepoName,
    group: "Monorepo",
  },
  {
    name: "description",
    type: "text",
    message: "Description:",
    default: "",
    group: "Monorepo",
  },
  {
    name: "license",
    type: "select",
    message: "License:",
    choices: [
      { label: "LGPL-3.0 - For libraries", value: "LGPL-3.0" },
      { label: "GPL-3.0 - For tools/applications", value: "GPL-3.0" },
    ],
    default: "LGPL-3.0",
    group: "Monorepo",
  },
  {
    name: "typescriptConfig",
    type: "select",
    message: "TypeScript config package:",
    choices: [
      {
        label: "@canonical/typescript-config-base - Standard (no DOM)",
        value: "@canonical/typescript-config-base",
      },
      {
        label:
          "@canonical/typescript-config-lit - Lit Web Components (DOM, decorators)",
        value: "@canonical/typescript-config-lit",
      },
    ],
    default: "@canonical/typescript-config-base",
    group: "Monorepo",
  },
  {
    name: "repository",
    type: "text",
    message: "GitHub repository URL:",
    default: "",
    validate: validateRepository,
    group: "Monorepo",
  },
  {
    name: "bunVersion",
    type: "text",
    message: "Bun version (pinned for CI):",
    default: "1.3.9",
    group: "Monorepo",
  },
  {
    name: "initGit",
    type: "confirm",
    message: "Initialize git repository?",
    default: true,
    group: "Post-setup",
  },
  {
    name: "runInstall",
    type: "confirm",
    message: "Run bun install after creation?",
    default: true,
    group: "Post-setup",
  },
];

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<MonorepoAnswers> = {
  meta: {
    name: "monorepo",
    description:
      "Generate a new Bun + Lerna monorepo with CI, release, and shared config",
    version: "0.1.0",
    help: `Generate a new monorepo shell with opinionated defaults.

This generator creates the monorepo infrastructure only — it does NOT create
an initial package. Use summon-package to add packages after setup.

WHAT'S INCLUDED:
  - Bun + Lerna + Nx orchestration
  - GitHub Actions CI (check + build-and-test)
  - PR lint (conventional commits)
  - Release workflow (tag.yml with NPM_AUTH_TOKEN)
  - Shared config (@canonical/biome-config, TypeScript config)
  - Coverage testing setup
  - Organized .gitignore
  - PR template
  - publish-status.ts script
  - Renovate config with batching families

POST-SETUP:
  1. Configure GitHub repo secret NPM_AUTH_TOKEN
  2. Configure GitHub repo: squash merge only, PR title as commit message
  3. Enable Renovate GitHub App on the repository
  4. Use summon-package to add the first package`,
    examples: [
      "summon monorepo --name=my-project",
      'summon monorepo --name=my-project --description="My awesome project" --license=LGPL-3.0',
      "summon monorepo --name=lit-components --typescript-config=@canonical/typescript-config-lit",
    ],
  },

  prompts,

  generate: (answers) => {
    const repoDir = answers.name;
    const ctx = createTemplateContext(answers);

    return sequence_([
      info(`Creating monorepo: ${answers.name}`),

      // Root directory
      mkdir(repoDir),
      mkdir(path.join(repoDir, "packages")),
      mkdir(path.join(repoDir, "scripts")),

      // GitHub Actions directories
      mkdir(path.join(repoDir, ".github")),
      mkdir(path.join(repoDir, ".github", "workflows")),
      mkdir(path.join(repoDir, ".github", "actions")),
      mkdir(path.join(repoDir, ".github", "actions", "setup-env")),
      mkdir(path.join(repoDir, ".github", "actions", "setup-git")),
      mkdir(path.join(repoDir, ".github", "actions", "lerna-version")),

      // Root config files
      template({
        source: templates.packageJson,
        dest: path.join(repoDir, "package.json"),
        vars: ctx,
      }),
      template({
        source: templates.lernaJson,
        dest: path.join(repoDir, "lerna.json"),
        vars: ctx,
      }),
      template({
        source: templates.nxJson,
        dest: path.join(repoDir, "nx.json"),
        vars: ctx,
      }),
      template({
        source: templates.tsconfigJson,
        dest: path.join(repoDir, "tsconfig.json"),
        vars: ctx,
      }),
      template({
        source: templates.biomeJson,
        dest: path.join(repoDir, "biome.json"),
        vars: ctx,
      }),
      template({
        source: templates.gitignore,
        dest: path.join(repoDir, ".gitignore"),
        vars: ctx,
      }),
      template({
        source: templates.readme,
        dest: path.join(repoDir, "README.md"),
        vars: ctx,
      }),
      template({
        source: templates.license,
        dest: path.join(repoDir, "LICENSE"),
        vars: ctx,
      }),
      template({
        source: templates.renovateJson,
        dest: path.join(repoDir, "renovate.json"),
        vars: ctx,
      }),

      // Scripts
      template({
        source: templates.publishStatus,
        dest: path.join(repoDir, "scripts", "publish-status.ts"),
        vars: ctx,
      }),

      // GitHub PR template
      template({
        source: templates.prTemplate,
        dest: path.join(repoDir, ".github", "PULL_REQUEST_TEMPLATE.md"),
        vars: ctx,
      }),

      // GitHub workflows
      template({
        source: templates.ciYml,
        dest: path.join(repoDir, ".github", "workflows", "ci.yml"),
        vars: ctx,
      }),
      template({
        source: templates.prLintYml,
        dest: path.join(repoDir, ".github", "workflows", "pr-lint.yml"),
        vars: ctx,
      }),
      template({
        source: templates.tagYml,
        dest: path.join(repoDir, ".github", "workflows", "tag.yml"),
        vars: ctx,
      }),

      // GitHub actions
      template({
        source: templates.setupEnv,
        dest: path.join(
          repoDir,
          ".github",
          "actions",
          "setup-env",
          "action.yml",
        ),
        vars: ctx,
      }),
      template({
        source: templates.setupGit,
        dest: path.join(
          repoDir,
          ".github",
          "actions",
          "setup-git",
          "action.yml",
        ),
        vars: ctx,
      }),
      template({
        source: templates.lernaVersionAction,
        dest: path.join(
          repoDir,
          ".github",
          "actions",
          "lerna-version",
          "action.yml",
        ),
        vars: ctx,
      }),
      template({
        source: templates.versionSh,
        dest: path.join(
          repoDir,
          ".github",
          "actions",
          "lerna-version",
          "version.sh",
        ),
        vars: ctx,
      }),
      template({
        source: templates.gitCommitSh,
        dest: path.join(
          repoDir,
          ".github",
          "actions",
          "lerna-version",
          "git-commit.sh",
        ),
        vars: ctx,
      }),

      // Make shell scripts executable
      flatMap(
        exec(
          "chmod",
          [
            "+x",
            path.join(
              repoDir,
              ".github",
              "actions",
              "lerna-version",
              "version.sh",
            ),
            path.join(
              repoDir,
              ".github",
              "actions",
              "lerna-version",
              "git-commit.sh",
            ),
          ],
          ".",
        ),
        () => info("Shell scripts marked executable"),
      ),

      // Git init (conditional)
      when(
        answers.initGit,
        flatMap(exec("git", ["init"], repoDir), () =>
          info("Git repository initialized"),
        ),
      ),

      // Install (conditional)
      when(
        answers.runInstall,
        sequence_([
          info("Running bun install..."),
          flatMap(exec("bun", ["install"], repoDir), () =>
            info("Dependencies installed"),
          ),
        ]),
      ),

      when(!answers.runInstall, info("Skipping install step")),

      info(""),
      info("Monorepo created successfully!"),
      info(""),
      info("Next steps:"),
      info(`  cd ${repoDir}`),
      info("  # Add NPM_AUTH_TOKEN secret to GitHub repo"),
      info("  # Configure squash merge in GitHub repo settings"),
      info("  # Enable Renovate GitHub App on the repository"),
      info("  # Use summon-package to add the first package"),
      info(""),
    ]);
  },
};

export default generator;
