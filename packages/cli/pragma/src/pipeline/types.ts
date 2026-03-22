type CommandKind =
  | { kind: "completions-client"; partial: string }
  | { kind: "completions-server" }
  | { kind: "doctor" }
  | { kind: "store-skip"; command: string }
  | { kind: "store-required" };

export type { CommandKind };
