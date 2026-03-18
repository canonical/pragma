/** Origin of a generator (for display purposes). */
export type GeneratorOrigin = "local" | "global" | "package" | "builtin";

/** A node in the generator discovery tree. */
export interface GeneratorNode {
  name: string;
  /** Directory path */
  path: string;
  /** Path to index.ts if this is a runnable generator */
  indexPath?: string;
  children: Map<string, GeneratorNode>;
  origin?: GeneratorOrigin;
  meta?: {
    name: string;
    description: string;
    version: string;
  };
}
