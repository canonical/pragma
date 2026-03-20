import type { CommandContext, CompletionTree } from "@canonical/cli-core";
import { resolveCompletion } from "@canonical/cli-core";

/**
 * Resolve a partial CLI input against a completion tree and return
 * newline-separated candidates.
 *
 * Splits the partial into words, delegates to resolveCompletion for
 * level detection (noun/verb/argument), invokes the matched completer,
 * and joins the results with newlines. Returns an empty string when
 * no completer matches.
 */
export default async function handleQuery(
  partial: string,
  tree: CompletionTree,
  ctx: CommandContext,
): Promise<string> {
  const words = partial.length === 0 ? [""] : partial.split(" ");
  const result = resolveCompletion(tree, words);
  if (!result.completer) return "";
  const candidates = await result.completer(result.partial, ctx);
  return candidates.join("\n");
}
