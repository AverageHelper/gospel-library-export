import type { Annotation } from "../structs/index.js";
import type { Dirent } from "node:fs";
import { annotation } from "../structs/annotations.js";
import { array, assert } from "superstruct";
import { loader } from "../ui/index.js";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { URL } from "node:url";

export const dataDir = new URL(`file:${resolvePath(process.cwd(), "data")}`);

/**
 * Searches the `./data` directory for viable annotations archives.
 */
export async function findArchives(): Promise<Map<string, Array<Annotation>>> {
	// Check `./data` directory for archives...
	const archives = new Map<string, Array<Annotation>>();

	let dir: ReadonlyArray<Dirent> | undefined;
	try {
		dir = await readdir(dataDir, {
			encoding: "utf-8",
			recursive: false,
			withFileTypes: true
		});
	} catch (error) {
		// Throw unknown errors
		if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error;

		// Create our `/data` directory since it doesn't already exist
		await mkdir(dataDir);
		loader.info(`Created archive directory at '${dataDir.pathname}'`);
	}

	loader.start(`Checking '${dataDir.pathname}' for archives...`);
	for (const entry of dir ?? []) {
		if (!entry.isFile()) continue; // only files
		const filePath = resolvePath(entry.path, entry.name);

		try {
			const contents = await readFile(filePath, { encoding: "utf-8" });

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
