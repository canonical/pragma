/**
 * Skill domain constants.
 *
 * SK.02 — skill source package definitions.
 */

/** Packages that may contain a `skills/` directory. */
export const SKILL_PACKAGES = [
  { pkg: "@canonical/design-system", subpath: "skills" },
  { pkg: "@canonical/anatomy-dsl", subpath: "skills" },
  { pkg: "@canonical/code-standards", subpath: "skills" },
  { pkg: "@canonical/pragma", subpath: "skills" },
] as const;
