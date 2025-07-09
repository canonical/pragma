import { readdir } from "node:fs/promises";

/**
 * Lists the contents of a directory, separating files and subdirectories.
 * Used for strict mode validation to detect unexpected files or directories.
 *
 * @param path - Path to the directory to list
 * @returns Promise that resolves to an object containing arrays of file and directory names
 * @throws Will throw an error if the directory cannot be read
 *
 * @example
 * ```typescript
 * const contents = await listDirectory("/path/to/project");
 * console.log(contents.files);       // ["package.json", "README.md"]
 * console.log(contents.directories); // ["src", "dist", "node_modules"]
 * ```
 */
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
