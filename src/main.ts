import type { Annotation, Folder } from "./structs/index.js";
import "source-map-support/register.js";
import { allFolders, annotationsInFolder, docForAnnotation, domain } from "./api.js";
import { join as joinPath } from "node:path";
import { parseArgs as _parseArgs } from "node:util";
import { parseXml } from "./helpers/parseXml.js";
import { truncated } from "./helpers/truncated.js";
import { URL } from "node:url";
import { version as packageVersion } from "./version.js";
import {
	BgBlue,
	BgCyan,
	BgGray,
	BgGreen,
	BgRed,
	BgYellow,
	Bright,
	Dim,
	FgCyan,
	FgMagenta,
	Reset
} from "./helpers/consoleColors.js";
import inquirer from "inquirer";
import ora from "ora";

const { values } = _parseArgs({
	options: {
		// Show the version, then exit
		version: { short: "v", type: "boolean", default: false }
	},
	strict: true
});

if (values.version) {
	console.info(`v${packageVersion}`);
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
}

async function selectFolder(): Promise<Folder> {
	const foldersLoader = ora().start("Loading Notebooks...");
	const foldersData = await allFolders();
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
	const annotationsData = await annotationsInFolder(folder);
	annotationsLoader.succeed(`${annotationsData.annotationsCount} annotations in Notebook`);

	// Cache all the docs now, so we don't duplicate because of async issues
	const annotationsWithDocs = new Map<string, Annotation>();
	for (const annotation of annotationsData.annotations) {
		annotationsWithDocs.set(annotation.uri, annotation);
	}
	const docsLoader = ora().start(`Loading ${annotationsWithDocs.size} docs...`);
	await Promise.all(Array.from(annotationsWithDocs.values()).map(docForAnnotation));
	docsLoader.succeed(`Preloaded ${annotationsWithDocs.size} unique docs`);

	const choices = await Promise.all(
		annotationsData.annotations.map(async annotation => ({
			name: truncated(annotation.note?.title ?? (await docForAnnotation(annotation)).headline, 30),
			value: annotation
		}))
	);

	// Present list of Annotations for user to choose from
	const { annotationOrReturn } = await inquirer.prompt<{
		annotationOrReturn: Annotation | "return";
	}>({
		type: "list",
		name: "annotationOrReturn",
		message: `1-${annotationsData.annotationsCount} of ${annotationsData.annotationsTotal} Annotations`,
		loop: false,
		choices: [
			{
				name: "..",
				value: "return"
			},
			...choices
		]
	});

	if (annotationOrReturn === "return") return null;
	return annotationOrReturn;
}

async function presentAnnotation(annotation: Annotation): Promise<void> {
	// Present the note
	const doc = await docForAnnotation(annotation);

	console.info();
	console.info(`${Bright}** Annotation **${Reset}`);
	console.info(`${Bright}Title:${Reset} ${annotation.note?.title ?? `${Dim}(No title)${Reset}`}`);

	const note = annotation.note?.content
		? parseXml(annotation.note.content).paragraph
		: `${Dim}(No note)${Reset}`;
	console.info(`${Bright}Note:${Reset}  ${note}`);

	// Present each highlight
	for (const highlight of annotation.highlights) {
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
				case "dark_blue":
					// TODO: Make sure these values are accurate to the API.
					color = BgBlue;
					break;
				case "purple":
					color = BgCyan;
					break;
				case "pink":
					color = BgRed;
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
				// TODO: Handle style too.
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

// UI Loop
while (true) {
	const folder = await selectFolder();

	while (true) {
		const annotation = await selectAnnotation(folder);
		if (!annotation) break;
		await presentAnnotation(annotation);

		// Next action?
		const returnToFolder = await shouldReturnToFolder(folder);
		if (!returnToFolder) {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(0);
		}
	}
}
