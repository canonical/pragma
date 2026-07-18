/**
 * The live read-noun surface, parameterized (R2 discipline).
 *
 * Every B-tier test in this directory drives its assertions over THIS —
 * never a noun list copied from the plan. It cross-references
 * `emitSurface(capabilities)` (the authoritative "what's live, what's hidden,
 * what's MCP-exposed" projection) against the raw `capabilities` array (for
 * the runnable `VerbSpec`), so the derived lists below automatically grow as
 * PR5/6/7 add nouns — nothing here names a specific noun.
 */

import { capabilities } from "../../capabilities/index.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { emitSurface } from "../../kernel/spec/emitSurface.js";
import type { VerbSpec } from "../../kernel/spec/types.js";

/** One live, non-hidden verb: its emitted facts plus the runnable spec. */
export interface LiveVerb {
  readonly noun: string;
  /** The verb label (`emitSurface`'s `v` — the noun itself for a self-verb). */
  readonly verb: string;
  /** The MCP tool name, or `false` when withheld from MCP. */
  readonly tool: string | false;
  readonly needsStore: boolean;
  readonly mutates: boolean;
  readonly spec: VerbSpec;
}

function buildLiveVerbs(): readonly LiveVerb[] {
  const specByKey = new Map<string, VerbSpec>();
  for (const module of capabilities) {
    for (const verb of module.verbs) {
      if (verb.hidden) continue;
      specByKey.set(verbKey(verb.path), verb);
    }
  }

  const emitted = emitSurface(capabilities);
  const live: LiveVerb[] = [];
  for (const [noun, { verbs }] of Object.entries(emitted.nouns)) {
    for (const entry of verbs) {
      const key = entry.v === noun ? noun : `${noun} ${entry.v}`;
      const spec = specByKey.get(key);
      if (!spec) continue; // Should not happen — emission mirrors the registry.
      live.push({
        noun,
        verb: entry.v,
        tool: entry.mcp ?? false,
        needsStore: entry.needsStore === true,
        mutates: entry.mutates === true,
        spec,
      });
    }
  }
  return live;
}

/** Every live, non-hidden verb across the whole capability catalog. */
export const liveVerbs: readonly LiveVerb[] = buildLiveVerbs();

/** Read nouns' `lookup` verbs, MCP-exposed, store-backed. */
export const lookupVerbs: readonly LiveVerb[] = liveVerbs.filter(
  (v) => v.verb === "lookup" && v.tool !== false && v.needsStore && !v.mutates,
);

/** Read nouns' `list` verbs, MCP-exposed, store-backed. */
export const listVerbs: readonly LiveVerb[] = liveVerbs.filter(
  (v) => v.verb === "list" && v.tool !== false && v.needsStore && !v.mutates,
);

/** Every store-backed, MCP-exposed, non-mutating (read) verb. */
export const storeBackedReadVerbs: readonly LiveVerb[] = liveVerbs.filter(
  (v) => v.needsStore && v.tool !== false && !v.mutates,
);

/** Every MCP-exposed, non-mutating (read) verb — storeless or store-backed. */
export const readVerbs: readonly LiveVerb[] = liveVerbs.filter(
  (v) => v.tool !== false && !v.mutates,
);
