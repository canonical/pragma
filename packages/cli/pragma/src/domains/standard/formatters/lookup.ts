/**
 * Formatters for `pragma standard lookup` output.
 *
 * Pure functions: StandardLookupInput → string.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { StandardLookupInput } from "./types.js";

const formatters: Formatters<StandardLookupInput> = {
  plain({ standard, detailed }) {
    const lines: string[] = [];
    lines.push(standard.name);
    lines.push(`Category: ${standard.category || "—"}`);
    lines.push(`Description: ${standard.description}`);
    if (standard.extends) {
      lines.push(`Extends: ${standard.extends}`);
    }

    if (detailed) {
      if (standard.dos.length > 0) {
        lines.push("");
        lines.push("Do:");
        for (const d of standard.dos) {
          lines.push(`  ${d.code}`);
        }
      }

      if (standard.donts.length > 0) {
        lines.push("");
        lines.push("Don't:");
        for (const d of standard.donts) {
          lines.push(`  ${d.code}`);
        }
      }
    }

    return lines.join("\n");
  },

  llm({ standard, detailed }) {
    const lines: string[] = [];
    lines.push(`## ${standard.name}`);
    lines.push(`Category: ${standard.category || "—"}`);
    lines.push(standard.description);

    if (detailed) {
      if (standard.dos.length > 0) {
        lines.push("");
        lines.push("### Do");
        for (const d of standard.dos) {
          lines.push(`- ${d.code}`);
        }
      }

      if (standard.donts.length > 0) {
        lines.push("");
        lines.push("### Don't");
        for (const d of standard.donts) {
          lines.push(`- ${d.code}`);
        }
      }
    }

    return lines.join("\n");
  },

  json({ standard, detailed }) {
    if (detailed) {
      return JSON.stringify(standard, null, 2);
    }
    const { dos: _dos, donts: _donts, ...summary } = standard;
    return JSON.stringify(summary, null, 2);
  },
};

export default formatters;
