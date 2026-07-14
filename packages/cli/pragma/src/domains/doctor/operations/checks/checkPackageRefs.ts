/**
 * Doctor check: report how each semantic package is resolved.
 *
 * Uses the loader chain (local > git > bundled) to show where each
 * package resolves from, its version, and graph/skill counts.
 */

import { readConfig } from "#config";
import {
  createBundledLoader,
  createGitLoader,
  createLocalLoader,
} from "../../../shared/loaders/index.js";
import { mergeAndParseRefs } from "../../../shared/mergeAndParseRefs.js";
import { resolveSemanticPackages } from "../../../shared/semanticPackage.js";
import type { CheckContext, CheckItem, CheckResult } from "../types.js";

/** Pluralize a count, e.g. `1 graph` / `2 graphs`. */
function count(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export default async function checkPackageRefs(
  ctx: CheckContext,
): Promise<CheckResult> {
  const config = readConfig(ctx.cwd);
  const refs = mergeAndParseRefs(config.packages);
  const loaders = [
    createLocalLoader(),
    createGitLoader(),
    createBundledLoader(),
  ];
  const packages = await resolveSemanticPackages(refs, loaders);

  const items: CheckItem[] = [];
  let unresolved = 0;

  for (const ref of refs) {
    const resolved = packages.find((p) => p.name === ref.pkg);

    if (resolved) {
      items.push({
        label: ref.pkg,
        status: "pass",
        detail: `${resolved.source} v${resolved.version} · ${count(resolved.graphs.length, "graph")}, ${count(resolved.skills.length, "skill")}`,
      });
    } else {
      // Check if covered by bundled fallback
      const bundled = packages.find((p) => p.name === "(bundled)");
      if (bundled) {
        items.push({
          label: ref.pkg,
          status: "pass",
          detail: `bundled fallback v${bundled.version}`,
        });
      } else {
        items.push({ label: ref.pkg, status: "fail", detail: "not resolved" });
        unresolved += 1;
      }
    }
  }

  const total = refs.length;
  const detail =
    unresolved > 0
      ? `${unresolved} of ${count(total, "package")} not resolved`
      : `${count(total, "package")} resolved`;

  return {
    name: "package refs",
    status: unresolved > 0 ? "fail" : "pass",
    detail,
    items,
    ...(unresolved > 0 ? { remedy: "pragma update-refs" } : {}),
  };
}
