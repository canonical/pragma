import * as path from "node:path";
import {
  exists,
  flatMap,
  pure,
  readFile,
  type Task,
} from "@canonical/task";
import type { MonorepoInfo } from "../types.js";

/**
 * Detect if running in a monorepo and get the version.
 *
 * @note Impure — reads lerna.json from the filesystem.
 */
export default function detectMonorepo(cwd: string): Task<MonorepoInfo> {
  const lernaPath = path.join(cwd, "lerna.json");
  const parentLernaPath = path.join(cwd, "..", "lerna.json");
  const grandparentLernaPath = path.join(cwd, "..", "..", "lerna.json");

  const parseLerna = (content: string): MonorepoInfo => {
    const lerna = JSON.parse(content);
    return { isMonorepo: true, version: lerna.version };
  };

  const notMonorepo: MonorepoInfo = { isMonorepo: false };

  return flatMap(exists(lernaPath), (hasLerna) => {
    if (hasLerna) {
      return flatMap(readFile(lernaPath), (content) =>
        pure(parseLerna(content)),
      );
    }
    return flatMap(exists(parentLernaPath), (hasParent) => {
      if (hasParent) {
        return flatMap(readFile(parentLernaPath), (content) =>
          pure(parseLerna(content)),
        );
      }
      return flatMap(exists(grandparentLernaPath), (hasGrandparent) => {
        if (hasGrandparent) {
          return flatMap(readFile(grandparentLernaPath), (content) =>
            pure(parseLerna(content)),
          );
        }
        return pure(notMonorepo);
      });
    });
  });
}
