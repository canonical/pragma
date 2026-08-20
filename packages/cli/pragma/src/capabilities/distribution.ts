/**
 * The distribution's own read stories, compiled at module load.
 *
 * `pragma.conf.ts` declares them on the packs that supply them; this is the ONE
 * place those declarations become capabilities. They come through the SAME door
 * a third-party story does — {@link compilePack} — so the mechanism the CLI
 * offers forks is the mechanism the CLI itself runs on.
 *
 * They are compiled STATICALLY rather than merged at dispatch on purpose: the
 * `--help` / `__complete` fast paths read the static capability set, and
 * `surface/surface.v2.json` freezes the emitted surface, so a noun that only
 * arrived at dispatch would vanish from help and completion on a fresh install.
 * That is affordable because this module is zod-free and pure — `pragma.conf.ts`
 * is inert data and `compilePack` builds specs without touching the store.
 *
 * Config- and package-declared stories still OVERRIDE these at dispatch; the
 * `story` marker on each module is what tells `assembleEffectiveModules` which
 * modules may be replaced.
 */

import conf from "../../pragma.conf.js";
import { compilePack } from "../kernel/packs/compile.js";
import {
  distributionSource,
  type PackDefinition,
} from "../kernel/packs/types.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { CapabilityModule } from "../kernel/spec/types.js";

/** The read stories `pragma.conf.ts` declares on its packs, by noun. */
export const declaredStories: ReadonlyMap<string, PackDefinition> = new Map(
  conf.packs
    .flatMap((pack) => pack.stories ?? [])
    .map((story): readonly [string, PackDefinition] => [story.noun, story]),
);

/**
 * Those stories compiled to capability modules, by noun.
 *
 * `capabilities/index.ts` appends every module no authored one claims — and
 * since L-OPEN-9 that is every one of them: no data noun is authored, so a
 * declared story IS the whole noun. `distribution.test.ts` holds that shut by
 * asserting each registered module's verbs deep-equal its compiled story's.
 */
export const storyModules: ReadonlyMap<string, CapabilityModule> = new Map(
  [...declaredStories].map(([noun, story]) => [
    noun,
    {
      name: noun,
      story: true,
      verbs: compilePack(
        story,
        distributionSource("pragma.conf.ts"),
        DEFAULT_PREFIX_MAP,
      ),
      colophon: story.colophon,
    },
  ]),
);
