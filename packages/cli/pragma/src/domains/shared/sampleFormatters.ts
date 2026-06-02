/**
 * Factory for sample command formatters.
 *
 * Every domain's sample formatter follows the same pattern: a count
 * header, then each item rendered via the domain's lookup formatter.
 * This factory eliminates the duplication.
 */

import type { Formatters } from "./formatters.js";
import type { SampleOutput } from "./types/index.js";

/**
 * Create a three-mode formatter for `pragma <domain> sample`.
 *
 * @param domain - plural domain label for the header (e.g. "standards")
 * @param renderItem - renders one item; receives the item and the mode
 */
export default function createSampleFormatters<T>(
  domain: string,
  renderItem: (item: T, mode: "plain" | "llm") => string,
): Formatters<SampleOutput<T>> {
  return {
    plain(output) {
      const header = `Showing ${output.samples.length} of ${output.totalCount} ${domain}\n`;
      const items = output.samples.map((item) => renderItem(item, "plain"));
      return header + items.join("\n\n");
    },

    llm(output) {
      const header = `Showing ${output.samples.length} of ${output.totalCount} ${domain}\n`;
      const items = output.samples.map((item) => renderItem(item, "llm"));
      return header + items.join("\n\n");
    },

    json(output) {
      return JSON.stringify(
        {
          samples: output.samples,
          totalCount: output.totalCount,
          nextSteps: output.nextSteps,
        },
        null,
        2,
      );
    },
  };
}
