import type { Annotation, Folder } from "./structs/index.js";
import "source-map-support/register.js";
import { allFolders, annotationsInFolder, docForAnnotation, domain } from "./api.js";
import { join as joinPath } from "node:path";
import { parseArgs as _parseArgs } from "node:util";
import { parseXml } from "./helpers/parseXml.js";
import { truncated } from "./helpers/truncated.js";
import { UnreachableCaseError } from "./helpers/UnreachableCaseError.js";
import { URL } from "node:url";
import { version as packageVersion } from "./version.js";
import {
	BgBlue,
	BgGray,
	BgGreen,
	BgRed,
	BgYellow,
	Bright,
	Dim,
	FgCyan,
	FgMagenta,
	Reset,
	Underscore
} from "./helpers/consoleColors.js";
import chunk from "lodash-es/chunk.js";
import inquirer from "inquirer";
import ora from "ora";

const { values } = _parseArgs({
	options: {
		// Show the version, then exit
		version: { short: "v", type: "boolean", default: false }
	},
	strict: true
});

function finish(): never {
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
}

if (values.version) {
	console.info(`v${packageVersion}`);
	finish();
}

let previousCookie: string | null = null;
async function requestCookie(fresh: boolean): Promise<string> {
	if (!fresh && previousCookie) return previousCookie;

	if (previousCookie) {
		// We had a cookie, but we need a new one
		console.info(
			"Your login cookie has expired. Please reload your Notes window and copy a fresh 'Cookie' header to paste here:"
		);
	} else {
		// We didn't have a cookie before
		console.info("-- Gospel Library Notes Inspector --");
		console.info("We need your login token in order to access your notes.");
		console.info(
			"Because I don't want to bother setting up OAuth to talk to churchofjesuschrist.org the 'proper' way, I'll ask you for your login cookie directly."
		);
		console.info("\t1. Log in to https://churchofjesuschrist.org");
		console.info("\t2. Open browser devtools");
		console.info("\t3. Open Network inspector");
		console.info("\t4. Go to Notes");
		console.info('\t5. Look for one of the requests to an endpoint that starts with "v3"');
		console.info("\t6. Find the 'Cookie' header sent in that request");
		console.info('\t7. Right click + "Copy Value"');
		console.info("\t8. Paste the value here:");
	}

	const { Cookie } = await inquirer.prompt<{ Cookie: string }>({
		type: "password",
		name: "Cookie",
		message: "Paste your login cookie and press Enter"
	});

	// eslint-disable-next-line require-atomic-updates
	previousCookie = Cookie;
	return Cookie;
}

async function selectFolder(): Promise<Folder> {
	const foldersLoader = ora().start("Loading Notebooks...");
	const foldersData = await allFolders(requestCookie);
	foldersLoader.succeed(`${foldersData.length} Notebooks`);

	// Present list of Notebooks for user to choose from
	const { folder } = await inquirer.prompt<{ folder: Folder }>({
		type: "list",
		name: "folder",
		message: "Select a Notebook:",
		loop: false,
		choices: foldersData.map(folder => ({
			name: `${folder.name} (${folder.annotationsCount})`,
			value: folder
		}))
	});
	console.info(`Selected Notebook '${folder.name}' with ${folder.annotationsCount} annotations`);

	return folder;
}

async function selectAnnotation(folder: Folder): Promise<Annotation | null> {
	const annotationsLoader = ora().start(`Loading annotations for Notebook '${folder.name}'...`);
	const {
		annotationsTotal,
		annotationsCount: initialCount,
		annotations: initialAnnotations
	} = await annotationsInFolder(folder, requestCookie);

	const annotations = new Array<Annotation>(annotationsTotal); // Array with slots pre-allocated
	let annotationsCount: number = initialCount;

	// Set the elements in-place
	for (const [index, annotation] of Object.entries(initialAnnotations)) {
		annotations[Number(index)] = annotation;
	}

	while (annotationsCount < annotationsTotal) {
		const annotationsData = await annotationsInFolder(folder, requestCookie, annotationsCount);
		// Set the elements in-place, starting where we left off
		for (const [index, annotation] of Object.entries(annotationsData.annotations)) {
			annotations[Number(index) + annotationsCount] = annotation;
		}
		annotationsCount += annotationsData.annotationsCount;
		annotationsLoader.start(`Loaded ${annotationsCount} of ${annotationsTotal} annotations...`);
	}

	annotationsLoader.succeed(`${annotationsTotal} annotations in Notebook`);

	const CHUNK_SIZE = 5;
	const choicesLoader = ora().start(`Loading ${annotations.length} annotations...`);
	const choices = new Array<{ name: string; value: Annotation; type: "choice" }>(
		annotations.length
	);

	let choicesLoaded = 0;
	for (const batch of chunk(annotations, CHUNK_SIZE)) {
		await Promise.all(
			Object.entries(batch).map(async ([index, annotation]) => {
				const name =
					annotation.note?.title ??
					(await docForAnnotation(annotation, requestCookie))?.headline ??
					annotation.annotationId;
				choices[Number(index) + choicesLoaded] = {
					name: truncated(name, 30),
					value: annotation,
					type: "choice"
				};
			})
		);
		choicesLoaded += batch.length;
		choicesLoader.start(`Prepared ${choicesLoaded} of ${annotations.length} annotations...`);
	}
	choicesLoader.succeed(`Prepared ${annotations.length} annotations`);

	// Present list of Annotations for user to choose from
	const { annotationOrReturn } = await inquirer.prompt<{
		annotationOrReturn: Annotation | "return";
	}>({
		type: "list",
		name: "annotationOrReturn",
		message: `${annotationsTotal} Annotations`,
		loop: false,
		choices: [
			{
				name: "..",
				value: "return",
				type: "choice"
			},
			...choices
		]
	});

	if (annotationOrReturn === "return") return null;
	return annotationOrReturn;
}

async function presentAnnotation(annotation: Annotation): Promise<void> {
	// Present the note
	const doc = await docForAnnotation(annotation, requestCookie);

	console.info();
	console.info(`${Bright}** Annotation **${Reset}`);
	console.info(`${Bright}Title:${Reset} ${annotation.note?.title ?? `${Dim}(No title)${Reset}`}`);

	const note = annotation.note?.content
		? parseXml(annotation.note.content).paragraph
		: `${Dim}(No note)${Reset}`;
	console.info(`${Bright}Note:${Reset}  ${note}`);

	if (!doc) return; // Bail early if no doc

	// Present each highlight
	for (const highlight of annotation.highlights ?? []) {
		const deepUrl = new URL(joinPath("/study", doc.referenceURI), domain);
		const headline = doc.referenceURIDisplayText;

		console.info();
		console.info(`${FgCyan}${headline}${Reset} | ${doc.publication}`);
		if (deepUrl) {
			console.info(`${Bright}View:${Reset} ${deepUrl.href}`);
		}

		for (const content of doc.content) {
			const parseResult = parseXml(content.markup);
			const verseNumber = parseResult.verseNumber;
			let paragraph = parseResult.paragraph;

			const startOffset = highlight.startOffset;
			const endOffset = highlight.endOffset; // -1 means "end of string" probably

			const words = paragraph.split(" ");
			const startIndex = words.slice(0, startOffset - 1).join(" ").length + 1; // The character where the startOffset word lives
			const endIndex = words.slice(0, endOffset).join(" ").length; // The character where the endOffset word ends

			// Set highlight color
			let color = BgRed;
			switch (highlight.color) {
				case "red":
					color = BgRed;
					break;
				case "orange":
					color = BgYellow;
					break;
				case "yellow":
					color = BgYellow;
					break;
				case "green":
					color = BgGreen;
					break;
				case "blue":
					color = BgBlue;
					break;
				case "brown":
					color = BgRed;
					break;
				case "gray":
					color = BgGray;
					break;
				case "clear":
					color = Bright;
					break;
				default:
					throw new UnreachableCaseError(highlight.color);
			}

			// Set underscore (to simulate colored underscore)
			switch (highlight.style) {
				case undefined:
					// nop
					break;
				case "red-underline":
					color += Underscore;
					break;
				default:
					throw new UnreachableCaseError(highlight.style);
			}

			paragraph =
				paragraph.slice(0, startIndex) +
				color +
				paragraph.slice(startIndex, endIndex) +
				Reset +
				paragraph.slice(endIndex);
			console.info(
				`${Bright}Content:${Reset} ${
					verseNumber === undefined ? "" : `${Bright}${verseNumber}${Reset} `
				}${paragraph}${Reset}`
			);

			console.info(
				`${Bright}Highlight:${Reset} ${
					highlight.style ?? highlight.color
				} thru words ${startOffset}-${endOffset}`
			);
		}
	}

	console.info();

	// Present tags
	const tagsValue =
		annotation.tags.length === 0
			? `${Dim}(No tags)${Reset}`
			: `${Dim}${annotation.tags.length} tag(s)${Reset}`;
	console.info(`${Bright}Tags:${Reset}       ${tagsValue}`);

	// Present Notebook membership
	const notebooksValue =
		annotation.folders.length === 0
			? `${Dim}(No notebooks)${Reset}`
			: annotation.folders.map(f => `${FgMagenta}${f.name}${Reset}`).join(", ");
	console.info(`${Bright}Notebooks:${Reset}  ${notebooksValue}`);
	console.info();
}

async function shouldReturnToFolder(folder: Folder): Promise<boolean> {
	const { returnToFolder } = await inquirer.prompt<{ returnToFolder: boolean }>({
		type: "confirm",
		name: "returnToFolder",
		message: `Return to Notebook '${folder.name}'?`
	});

	return returnToFolder;
}

// ** UI Loop **

// Select Notebook
await requestCookie(true);

while (true) {
	const folder = await selectFolder();

	// Select annotation from folder
	while (true) {
		const annotation = await selectAnnotation(folder);
		if (!annotation) break; // Assume the user requested to go up one level

		await presentAnnotation(annotation);

		// Next action?
		const returnToFolder = await shouldReturnToFolder(folder);
		if (!returnToFolder) finish();
	}
}
