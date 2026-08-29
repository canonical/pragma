/**
 * Formatters for `pragma upgrade` — plain (chalk), llm, json.
 *
 * Renders the REAL-run outcome (the `--dry-run` plan is rendered by the
 * dispatcher's plan renderer, not here), so there is no "would run" branch: a
 * needed run always carries `executed: true`.
 */

import chalk from "chalk";
import type { Formatters } from "../../kernel/spec/index.js";
import { PRAGMA_PACKAGE } from "../shared/index.js";
import type { UpgradeData } from "./types.js";

export const upgradeFormatters: Formatters<UpgradeData> = {
  plain(data) {
    const lines = [`Installed via: ${data.pm}`];
    if (data.offline) {
      lines.push("Cannot reach the registry — try again later.");
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
    } else if (data.command) {
      lines.push(`Run: ${chalk.cyan(data.command)}`);
    } else {
      // No sanctioned command for this install (linked / ephemeral /
      // workspace / unknown) — the guidance sentence is the whole story.
      lines.push(`No automatic upgrade for this install: ${data.guidance}`);
    }
    return lines.join("\n");
  },

  llm(data) {
    if (data.offline) return "Upgrade check failed: cannot reach the registry.";
    if (data.alreadyLatest) {
      return `Already at the latest version (${data.current}).`;
    }
    if (data.executed) return `Upgraded: ${data.current} → ${data.latest}`;
    if (data.command) {
      return `Update available: ${data.current} → ${data.latest} (\`${data.command}\`)`;
    }
    return `Update available: ${data.current} → ${data.latest} — ${data.guidance}`;
  },

  json(data) {
    return JSON.stringify(data);
  },
};
