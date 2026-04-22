/**
 * Doctor check: report how each semantic package is resolved.
 *
 * Shows whether packages resolve from npm, file://, or git cache,
 * and warns if a configured ref is missing its cache.
 */

import { existsSync } from "node:fs";
import { readConfig } from "#config";
import {
  parsePackageEntry,
  type RawPackageEntry,
} from "../../../refs/operations/parseRef.js";
import { gitCacheDir } from "../../../refs/operations/paths.js";
import readGlobalRefs from "../../../refs/operations/readGlobalRefs.js";
import { DEFAULT_PACKAGES } from "../../../shared/packages.js";
import type { CheckContext, CheckResult } from "../types.js";

export default async function checkPackageRefs(
  ctx: CheckContext,
): Promise<CheckResult> {
  const config = readConfig(ctx.cwd);
  const globalEntries = readGlobalRefs();

  const hasProjectRefs = config.packages && config.packages.length > 0;
  const hasGlobalRefs = globalEntries.length > 0;

  if (!hasProjectRefs && !hasGlobalRefs) {
    return {
      name: "package refs",
      status: "pass",
      detail: `${DEFAULT_PACKAGES.length} packages (all npm, defaults)`,
    };
  }

  const entries: ReadonlyArray<RawPackageEntry> =
    config.packages ?? globalEntries;

  const details: string[] = [];
  let hasIssue = false;

  for (const entry of entries) {
    const ref = parsePackageEntry(entry);

    switch (ref.kind) {
      case "npm":
        details.push(`${ref.pkg}: npm`);
        break;
      case "file":
        if (existsSync(ref.path)) {
          details.push(`${ref.pkg}: file (${ref.path})`);
        } else {
          details.push(`${ref.pkg}: file MISSING (${ref.path})`);
          hasIssue = true;
        }
        break;
      case "git": {
        const cached = existsSync(gitCacheDir(ref.pkg, ref.ref));
        if (cached) {
          details.push(`${ref.pkg}: git #${ref.ref} (cached)`);
        } else {
          details.push(`${ref.pkg}: git #${ref.ref} NOT CACHED`);
          hasIssue = true;
        }
        break;
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
