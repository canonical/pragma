import type { PragmaRuntime } from "../../shared/runtime.js";
import { listTokens } from "../operations/index.js";
import type { TokenListResolution } from "../types.js";
import tokenEmptyError from "./tokenEmptyError.js";

export default async function resolveTokenList(
  rt: Pick<PragmaRuntime, "store">,
  params: { category?: string },
): Promise<TokenListResolution> {
  const items = await listTokens(rt.store, { category: params.category });

  if (items.length === 0) {
    throw tokenEmptyError(params.category);
  }

  return { params, items };
}
