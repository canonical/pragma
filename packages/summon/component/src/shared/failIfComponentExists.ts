import { exists, fail, flatMap, pure, type Task } from "@canonical/task";

/**
 * Refuse to scaffold over an existing component directory.
 *
 * Every generated write carries a delete as its default undo, so scaffolding
 * over an existing directory and then running `--undo` would destroy files
 * the user owned before the run. The domain/wrapper generators in
 * summon-application guard the same way for the same reason.
 */
export default function failIfComponentExists(
  componentDir: string,
): Task<void> {
  return flatMap(exists(componentDir), (present) =>
    present
      ? fail({
          code: "COMPONENT_EXISTS",
          message:
            `"${componentDir}" already exists. Scaffolding over it would let ` +
            "--undo delete pre-existing files. Choose a different path or " +
            "remove the directory first.",
        })
      : pure(undefined),
  );
}
