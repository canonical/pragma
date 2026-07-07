/**
 * Doctor check: report how each semantic package is resolved.
 *
 * Uses the loader chain (local > git > bundled) to show where each
 * package resolves from, its version, and graph/skill counts.
 */

import { readConfig } from "#config";
import { parsePackageEntry } from "../../../refs/operations/parseRef.js";
import readGlobalRefs from "../../../refs/operations/readGlobalRefs.js";
import {
  createBundledLoader,
  createGitLoader,
  createLocalLoader,
} from "../../../shared/loaders/index.js";
import { DEFAULT_PACKAGES } from "../../../shared/packages.js";
import { resolveSemanticPackages } from "../../../shared/semanticPackage.js";
import type { CheckContext, CheckResult } from "../types.js";

export default async function checkPackageRefs(
  ctx: CheckContext,
): Promise<CheckResult> {
  const config = readConfig(ctx.cwd);
  const globalEntries = readGlobalRefs();

  const projectRefs = config.packages;
  const rawEntries =
    projectRefs && projectRefs.length > 0
      ? projectRefs
      : globalEntries.length > 0
        ? globalEntries
        : DEFAULT_PACKAGES;

  const refs = [...rawEntries].map(parsePackageEntry);
  const loaders = [
    createLocalLoader(),
    createGitLoader(),
    createBundledLoader(),
  ];
  const packages = await resolveSemanticPackages(refs, loaders);

  const details: string[] = [];
  let hasIssue = false;

  for (const ref of refs) {
    const resolved = packages.find((p) => p.name === ref.pkg);

    if (resolved) {
      details.push(
        `${ref.pkg}: ${resolved.source} v${resolved.version} (${resolved.graphs.length} graphs, ${resolved.skills.length} skills)`,
      );
    } else {
      // Check if covered by bundled fallback
      const bundled = packages.find((p) => p.name === "(bundled)");
      if (bundled) {
        details.push(`${ref.pkg}: bundled v${bundled.version}`);
      } else {
        details.push(`${ref.pkg}: NOT RESOLVED`);
        hasIssue = true;
      }
    }
  }

  return {
    name: "package refs",
    status: hasIssue ? "fail" : "pass",
    detail: details.join("; "),
    ...(hasIssue ? { remedy: "pragma update-refs" } : {}),
  };
}
