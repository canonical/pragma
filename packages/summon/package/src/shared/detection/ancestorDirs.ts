import * as path from "node:path";

/**
 * Every directory from `start` up to the filesystem root, nearest first.
 */
export default function ancestorDirs(start: string): string[] {
  const dirs: string[] = [];
  let current = path.resolve(start);
  for (;;) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      return dirs;
    }
    current = parent;
  }
}
