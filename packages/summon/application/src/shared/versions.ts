import { createRequire } from "node:module";
import type { Task } from "@canonical/task";
import { info } from "@canonical/task";

const require = createRequire(import.meta.url);

function readVersion(packageName: string): string {
  try {
    const pkg = require(`${packageName}/package.json`);

    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const coreVersion = readVersion("@canonical/summon-core");
const appVersion = readVersion("@canonical/summon-application");

/**
 * Print a version table for the current generator run.
 */
export function printVersions(generatorName: string): Task<void> {
  return info(
    `@canonical/summon-core         ${coreVersion}\n` +
      `@canonical/summon-application  ${appVersion}  (${generatorName})`,
  );
}
