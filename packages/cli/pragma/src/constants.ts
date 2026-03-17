const VALID_CHANNELS = ["normal", "experimental", "prerelease"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

export { VALID_CHANNELS };
export type { Channel };
