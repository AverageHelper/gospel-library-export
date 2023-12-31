import type { Annotation } from "../structs/index.js";
import select from "@inquirer/select";
import { isNonEmptyArray } from "../helpers/isNonEmptyArray.js";
import { loader } from "./loader.js";
import { parse as parsePath } from "node:path";
import { viewAnnotationData } from "./viewAnnotationData.js";

/**
 * A UI loop to select and read of of the given annotations archives.
 */
export async function selectAndViewArchive(
	archives: ReadonlyMap<string, ReadonlyArray<Annotation>>
): Promise<void> {
	if (archives.size === 0) {
		loader.fail("No archives to view.");
		return;
	}

	const allArchives = Array.from(archives.entries())
		.map(([path, value]) => {
			const name = parsePath(path).name;

			return {
				name,
				value
			};
		})
		.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});

	if (allArchives.length === 1 && isNonEmptyArray(allArchives)) {
		const { name, value } = allArchives[0];
		loader.info(`Only one archive: '${name}'`);
		await viewAnnotationData(value);
		return;
	}

	const archive = await select<ReadonlyArray<Annotation>>({
		message: "Select an archive:",
		choices: allArchives
	});

	await viewAnnotationData(archive);
}
