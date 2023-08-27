import type { Annotation, Folder } from "./structs/index.js";
import "source-map-support/register.js";
import { allFolders, annotationsInFolder, docForAnnotation, domain } from "./api.js";
import { Bright, Dim, FgCyan, FgMagenta, Reset } from "./helpers/consoleColors.js";
import { join as joinPath } from "node:path";
import { parseArgs as _parseArgs } from "node:util";
import { truncated } from "./helpers/truncated.js";
import { URL } from "node:url";
import { version as packageVersion } from "./version.js";
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
} else {
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

	// Present list of Annotations for user to choose from
	const { annotation } = await inquirer.prompt<{ annotation: Annotation }>({
		type: "list",
		name: "annotation",
		message: `1-${annotationsData.annotationsCount} of ${annotationsData.annotationsTotal} Annotations`,
		loop: false,
		choices: await Promise.all(
			annotationsData.annotations.map(async annotation => ({
				name: truncated(
					annotation.note?.title ?? (await docForAnnotation(annotation)).headline,
					30
				),
				value: annotation
			}))
		)
	});

	// Present the note
	const doc = await docForAnnotation(annotation);

	console.info();
	console.info(`${Bright}** Annotation **${Reset}`);
	console.info(`${Bright}Title:${Reset} ${annotation.note?.title ?? `${Dim}(No title)${Reset}`}`);
	console.info(`${Bright}Note:${Reset}  ${annotation.note?.content ?? `${Dim}(No note)${Reset}`}`);

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
			console.info(`${Bright}Content:${Reset} ${content.markup}`);
			console.info(
				`${Bright}Highlight:${Reset} Words ${highlight.startOffset}-${highlight.endOffset}`
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

	// console.info(annotation);
	// console.info(doc);
}
