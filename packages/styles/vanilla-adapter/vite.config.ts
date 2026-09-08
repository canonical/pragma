import { defineConfig } from "vitest/config";

/**
 * One project, and it runs in node. `tests/elements.test.ts` asks what the
 * files say: it reads this package's `elements.css` and the stylesheets
 * `@canonical/styles` composes, and binds the one to the other rule by rule.
 * No browser can answer that question better than a parser can, and none is
 * needed to ask it.
 *
 * The fixtures that do need a browser — whole documents in iframes, computed
 * styles compared between a mixed page and a pragma-only one — arrive with the
 * proof that stacks on this change, and add a second project beside this one.
 * Naming the project here rather than leaving vitest to its defaults is what
 * lets a contributor run one half deliberately, and what keeps this package's
 * test surface a statement rather than a convention.
 */
export default defineConfig({
  test: {
    // The verbose reporter is the one that prints skip reasons.
    reporters: ["verbose"],
    projects: [
      {
        extends: true,
        test: {
          name: "sources",
          environment: "node",
          include: ["tests/elements.test.ts"],
        },
      },
    ],
  },
});
