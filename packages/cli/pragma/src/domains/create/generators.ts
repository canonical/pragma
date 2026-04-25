import { generators } from "@canonical/summon-component";
import type { AnyGenerator } from "@canonical/summon-core";

export const COMPONENT_GENERATORS: Record<string, AnyGenerator> = {
  react: generators["component/react"],
  svelte: generators["component/svelte"],
  lit: generators["component/lit"],
};
