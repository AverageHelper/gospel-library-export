import type { Annotation } from "./structs/annotations.js";
import type { Dirent } from "node:fs";
import "source-map-support/register.js";
import inquirer from "inquirer";
import { annotation } from "./structs/annotations.js";
import { allAnnotations } from "./api.js";
import { array, assert } from "superstruct";
import { finish } from "./helpers/finish.js";
import { header } from "./helpers/formatting.js";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { UnreachableCaseError } from "./helpers/UnreachableCaseError.js";
import { URL } from "node:url";
import {
	loader,
	presentAnnotation,
	requestCookie,
	selectAnnotation,
	selectFolder,
	selectTag,
	shouldReturnToFolder,
	shouldReturnToMenu,
	shouldReturnToTag
} from "./ui/index.js";

const dataDir = new URL(`file:${resolvePath(process.cwd(), "data")}`);

async function downloadAll(): Promise<void> {
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

	const fileUrl = new URL(`file:${resolvePath(dataDir.pathname, "archive.json")}`);
	const fileData = JSON.stringify(annotations);
	await writeFile(fileUrl, fileData, { encoding: "utf-8" });

	loader.succeed(`Wrote ${annotations.length} annotations to '${fileUrl.pathname}'`);
}

/**
 * A UI loop for viewing the given annotations. If no data is given, then
 * we will use churchofjesuschrist.org's API to view annotations.
 */
async function viewAnnotationData(archive?: ReadonlyArray<Annotation>): Promise<void> {
	const tabs = [
		{
			name: "Notes",
			value: "notes"
		},
		{
			name: "Tags",
			value: "tags"
		},
		{
			name: "Notebooks",
			value: "notebooks"
		},
		{
			name: "Study Sets",
			value: "study-sets"
		}
	] as const;

	type Tab = (typeof tabs)[number]["value"];

	async function selectTab(): Promise<Tab> {
		const { tab } = await inquirer.prompt<{ tab: Tab }>({
			type: "list",
			name: "tab",
			message: "Select a tab:",
			choices: tabs
		});
		return tab;
	}

	if (!archive) {
		await requestCookie(true);
	}

	while (true) {
		const tab = await selectTab();

		switch (tab) {
			case "notebooks":
				// Select Notebook
				while (true) {
					const folder = await selectFolder(archive);
					if (!folder) break; // Assume the user requested to go up one level

					// Select annotation from folder
					while (true) {
						const annotation = await selectAnnotation(folder, archive);
						if (!annotation) break; // Assume the user requested to go up one level

						await presentAnnotation(annotation);

						// Next action?
						const returnOrExit = await shouldReturnToFolder(folder);
						if (!returnOrExit) finish();
					}
				}
				break;

			case "notes":
				// Select annotation
				while (true) {
					const annotation = await selectAnnotation(undefined, archive);
					if (!annotation) break; // Assume the user requested to go up one level

					await presentAnnotation(annotation);

					// Next action?
					const returnOrExit = await shouldReturnToMenu();
					if (!returnOrExit) finish();
				}
				break;

			case "tags":
				// Select tag
				while (true) {
					const tag = await selectTag();
					if (!tag) break; // Assume the user requested to go up one level

					// Select annotation from tag
					while (true) {
						const annotation = await selectAnnotation(tag, archive);
						if (!annotation) break; // Assume the user requested to go up one level

						await presentAnnotation(annotation);

						// Next action?
						const returnOrExit = await shouldReturnToTag(tag);
						if (!returnOrExit) finish();
					}
				}
				break;

			case "study-sets":
				console.info(header("Study Sets are not yet supported"));
				await new Promise(resolve => setTimeout(resolve, 500)); // Wait for user to read the message
				break;

			default:
				throw new UnreachableCaseError(tab);
		}
	}
}

async function selectAndViewArchive(
	archives: ReadonlyMap<string, ReadonlyArray<Annotation>>
): Promise<void> {
	if (archives.size === 0) {
		loader.fail("No archives to view.");
		return;
	}

	const { archive } = await inquirer.prompt<{ archive: ReadonlyArray<Annotation> }>({
		type: "list",
		name: "archive",
		message: "Select an archive:",
		choices: Array.from(archives.entries()).map(([name, value]) => ({
			name,
			value
		}))
	});

	await viewAnnotationData(archive);
}

// ** UI Loop **

console.info(header("Gospel Library Notes Inspector"));

while (true) {
	type Action = "download" | "online" | "offline";

	// Check `./data` directory for archives...
	const archives = new Map<string, ReadonlyArray<Annotation>>();

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

			// Cache the archive for later use
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

	const { action } = await inquirer.prompt<{ action: Action }>({
		type: "list",
		name: "action",
		message: "What would you like to do?",
		choices: [
			// TODO: Make clearer what these do:
			{
				name: "View Offline",
				value: "offline",
				disabled: archives.size <= 0 // disabled if no archives to view
			},
			{
				name: "Download All",
				value: "download"
			},
			{
				name: "View Online",
				value: "online"
			}
		]
	});

	switch (action) {
		case "download":
			// Download prod data to `./data` folder, then exit
			await downloadAll();
			break;

		case "online":
			// Emulate website for viewing online prod data
			await viewAnnotationData();
			break;

		case "offline":
			// Emulate website for viewing local archive data
			await selectAndViewArchive(archives);
			break;

		// TODO: Exit option?

		default:
			throw new UnreachableCaseError(action);
	}
}
