/**
 * Formatters for `pragma upgrade` — plain (chalk), llm, json.
 *
 * Renders the REAL-run outcome (the `--dry-run` plan is rendered by the
 * dispatcher's plan renderer, not here), so there is no "would run" branch: a
 * needed run always carries `executed: true`.
 */

import chalk from "chalk";
import type { Formatters } from "../../kernel/spec/types.js";
import { PRAGMA_PACKAGE } from "../shared/registry.js";
import type { UpgradeData } from "./types.js";

export const upgradeFormatters: Formatters<UpgradeData> = {
  plain(data) {
    const lines = [`Installed via: ${data.pm}`];
    if (data.offline) {
      lines.push("Could not reach the registry — try again later.");
      return lines.join("\n");
    }
    if (data.alreadyLatest) {
      lines.push(`Already at the latest version (${data.current}).`);
      return lines.join("\n");
    }
    lines.push(
      "",
      `${PRAGMA_PACKAGE}  ${data.current} → ${chalk.green(String(data.latest))}`,
      "",
    );
    if (data.executed) {
      lines.push(
        `Ran: ${chalk.cyan(data.command)}`,
        "",
        `Updated to ${data.latest}.`,
      );
    } else {
      lines.push(`Run: ${chalk.cyan(data.command)}`);
    }
    return lines.join("\n");
  },

  llm(data) {
    if (data.offline)
      return "Upgrade check failed: could not reach the registry.";
    if (data.alreadyLatest) {
      return `Already at the latest version (${data.current}).`;
    }
    if (data.executed) return `Upgraded: ${data.current} → ${data.latest}`;
    return `Update available: ${data.current} → ${data.latest} (\`${data.command}\`)`;
  },

  json(data) {
    return JSON.stringify(data);
  },
};
