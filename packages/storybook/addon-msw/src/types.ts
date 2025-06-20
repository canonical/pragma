import type { RequestHandler } from "msw";

export interface MswParameter {
  handlers?: RequestHandler[];
  // Additional options for story-level configuration
  disable?: boolean;
}

export interface MswGlobals {
  enabled: boolean;
  // Could add more global options like delay, etc.
}
