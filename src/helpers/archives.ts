import type { Annotation } from "../structs/index.js";
import type { Dirent, FilesystemProxy } from "../helpers/fs.js";
import { annotation } from "../structs/annotations.js";
import { array, assert } from "superstruct";
import { loader } from "../ui/index.js";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

export const dataDir = pathToFileURL(resolvePath("data"));

/**
 * Searches the `./data` directory for viable annotations archives.
 */
export async function findArchives(fs: FilesystemProxy): Promise<Map<string, Array<Annotation>>> {
	// Check `./data` directory for archives...
	const archives = new Map<string, Array<Annotation>>();

	let dir: ReadonlyArray<Dirent> | undefined;
	try {
		dir = await fs.readdir(dataDir, {
			encoding: "utf-8",
			recursive: false,
			withFileTypes: true
		});

		for (const entry of dir) {
			// Bun v1 does not provide the `path` property of `Dirent`
			entry.path ??= dataDir.pathname;
		}
	} catch (error) {
		// Throw unknown errors
		if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error;

		// Create our `/data` directory since it doesn't already exist
		await fs.mkdir(dataDir);
		loader.info(`Created archive directory at '${dataDir.pathname}'`);
	}

	loader.start(`Checking '${dataDir.pathname}' for archives...`);
	for (const entry of dir ?? []) {
		if (!entry.isFile()) continue; // only files
		const filePath = resolvePath(entry.path, entry.name);

		try {
			const contents = await fs.readFile(filePath, "utf-8");

			// See if data is a valid annotation archive
			const data = JSON.parse(contents) as unknown;
			assert(data, array(annotation));

			// Collect the archive
			archives.set(filePath, data);
		} catch (error) {
			// Invalid archive for whatever reason
			loader.fail(`Archive at '${filePath}' is not valid: ${JSON.stringify(error)}`);
			continue;
		}
	}
	if (archives.size > 0) {
		loader.succeed(`Found ${archives.size} valid archive${archives.size === 1 ? "" : "s"}`);
	} else {
		loader.fail("Found 0 valid archives");
	}

	return archives;
}
