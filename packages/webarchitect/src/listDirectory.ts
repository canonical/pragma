import { readdir } from "node:fs/promises";

export default async function listDirectory(
  path: string,
): Promise<{ files: string[]; directories: string[] }> {
  const entries = await readdir(path, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  return { files, directories };
}
