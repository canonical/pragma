/**
 * Package generator metadata
 *
 * Name, description, version, help text, and usage examples.
 */

import type { GeneratorMeta } from "@canonical/summon";

export const meta: GeneratorMeta = {
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
};
