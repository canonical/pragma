import type { CountedField, CountedRows } from "./types.js";

/**
 * Create rows of machines — a name, a status alternating failed and ready,
 * and a cpu count — whose `counted` field counts every read, so a test sees
 * how often a source reads the rows: once for a selection, once more for
 * each pass it makes.
 *
 * @note Impure: each read of the counted field adds to the count.
 */
export default function createCountedRows(
  count: number,
  counted: CountedField,
): CountedRows {
  let reads = 0;
  const rows = Array.from({ length: count }, (_unused, at) => {
    const values = {
      name: `web-${at}`,
      status: at % 2 === 0 ? "failed" : "ready",
    };
    return Object.defineProperty(
      { id: `m${at}`, cpu: at, ...values },
      counted,
      {
        enumerable: true,
        get: (): string => {
          reads += 1;
          return values[counted];
        },
      },
    );
  });
  return { rows, readCount: () => reads };
}
