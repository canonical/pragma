import type { Channel } from "../constants.js";

interface PragmaConfig {
  tier: string | undefined;
  channel: Channel;
}

interface ConfigUpdate {
  tier?: string | undefined;
  channel?: Channel | undefined;
}

export type { ConfigUpdate, PragmaConfig };
