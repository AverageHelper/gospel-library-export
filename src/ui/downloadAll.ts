import type { Annotation } from "../structs/annotations.js";
import format from "date-fns/format/index.js";
import { allAnnotations } from "../api.js";
import { annotation } from "../structs/annotations.js";
import { array, assert } from "superstruct";
import { dataDir } from "../helpers/archives.js";
import { loader } from "./loader.js";
import { pathToFileURL } from "node:url";
import { requestCookie } from "./requestCookie.js";
import { resolve as resolvePath } from "node:path";
import { writeFile } from "node:fs/promises";

/**
 * A UI loop to download all of a user's annotations to a local
 * file for later offline viewing.
 */
export async function downloadAll(): Promise<void> {
	const PAGE_SIZE = 1000; // in testing, this is the page size given when page size is omitted

	await requestCookie(true);

	loader.start("Loading annotations...");
	const {
		annotations: initialAnnotations,
		annotationsCount: initialCount,
		annotationsTotal
	} = await allAnnotations(requestCookie, 0, PAGE_SIZE);

	let startIndex = initialCount;
	const annotations = new Array<Annotation>(annotationsTotal);

	for (const [index, annotation] of Object.entries(initialAnnotations)) {
		annotations[Number(index)] = annotation;
	}

	loader.start(`Loaded ${initialCount} of ${annotationsTotal} annotations...`);
	while (startIndex < annotationsTotal) {
		const batch = await allAnnotations(requestCookie, startIndex, PAGE_SIZE);

		for (const [index, annotation] of Object.entries(batch.annotations)) {
			annotations[Number(index) + startIndex] = annotation;
		}

		startIndex += batch.annotationsCount;
		loader.start(`Loaded ${startIndex} of ${annotationsTotal} annotations...`);
	}

	assert(annotations, array(annotation)); // Sanity check that we got our indices right

	const now = new Date();
	const fileName = `archive ${format(now, "uuuu-MM-dd HH-mm-ss.SSS X")}`;
	const fileExtension = "json";
	const fileUrl = pathToFileURL(resolvePath(dataDir.pathname, `${fileName}.${fileExtension}`));

	const fileData = JSON.stringify(annotations);
	await writeFile(fileUrl, fileData, { encoding: "utf-8" });

	loader.succeed(
		`Wrote ${annotations.length} annotations to '${decodeURIComponent(fileUrl.pathname)}'`
	);
}
