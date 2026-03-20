/**
 * Skill domain constants.
 *
 * SK.02 — hardcoded skill source paths. Not configurable in pragma.config.json.
 */

export const SKILL_SOURCES = [
  "node_modules/@canonical/ds-global/skills",
  "node_modules/@canonical/anatomy-dsl/skills",
  "node_modules/@canonical/pragma/skills",
] as const;

export const SOURCE_PACKAGE_MAP: Readonly<Record<string, string>> = {
  "node_modules/@canonical/ds-global/skills": "@canonical/ds-global",
  "node_modules/@canonical/anatomy-dsl/skills": "@canonical/anatomy-dsl",
  "node_modules/@canonical/pragma/skills": "@canonical/pragma",
};
