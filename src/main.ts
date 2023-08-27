import type { Annotation, Doc, Folder } from "./structs/index.js";
import "source-map-support/register.js";
import { annotations, docs, folders } from "./structs/index.js";
import { assert } from "superstruct";
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

const Cookie = ""; // Paste the value of your `Cookie` header here

const domain = new URL("https://www.churchofjesuschrist.org");

const docsCache = new Map<string, Doc>();

async function docForAnnotation(annotation: Annotation): Promise<Doc> {
	const uri = annotation.uri;

	const extantDoc = docsCache.get(uri);
	if (extantDoc) return extantDoc;

	const docsApi = new URL("/content/api/v3", domain);
	docsApi.searchParams.set("uris", uri);
	docsApi.searchParams.set("lang", "eng");

	const docsRes = await fetch(docsApi, {
		credentials: "include",
		headers: {
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.5",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			Cookie
		},
		method: "GET",
		mode: "cors"
	});

	if (!docsRes.ok) throw new Error(`STATUS: ${docsRes.status}`);

	const docsData = await docsRes.json();
	assert(docsData, docs);

	const doc = docsData[uri];
	if (!doc) throw new Error(`No doc for URI '${uri}': ${JSON.stringify(docsData)}`);

	docsCache.set(uri, doc);
	return doc;
}

if (values.version) {
	console.info(`v${packageVersion}`);
} else {
	const foldersApi = new URL("/notes/api/v3/folders", domain);
	foldersApi.searchParams.set("setId", "all");

	const foldersLoader = ora().start("Loading Notebooks...");
	const foldersRes = await fetch(foldersApi, {
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Accept-Language": "en-US,en;q=0.5",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			Cookie
		},
		method: "GET",
		mode: "cors"
	});

	if (!foldersRes.ok) throw new Error(`STATUS: ${foldersRes.status}`);

	const foldersData = await foldersRes.json();
	assert(foldersData, folders);
	foldersLoader.succeed(`Loaded ${foldersData.length} Notebooks`);

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

	const annotationsApi = new URL("/notes/api/v3/annotationsWithMeta", domain);
	if (folder.folderId) {
		// Omit `folderId` for Unassigned Notes
		annotationsApi.searchParams.set("folderId", folder.folderId);
	}
	annotationsApi.searchParams.set("setId", "all");
	annotationsApi.searchParams.set("type", "journal,reference,highlight");
	annotationsApi.searchParams.set("numberToReturn", "50");

	const annotationsLoader = ora().start(`Loading annotations for Notebook '${folder.name}'...`);
	const annotationsRes = await fetch(annotationsApi, {
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Accept-Language": "en-US,en;q=0.5",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			Cookie
		},
		method: "GET",
		mode: "cors"
	});

	if (!annotationsRes.ok) throw new Error(`STATUS: ${annotationsRes.status}`);

	const annotationsData = await annotationsRes.json();
	assert(annotationsData, annotations);
	annotationsLoader.succeed(`Loaded ${annotationsData.annotationsCount} annotations`);

	// Cache all the docs now, so we don't duplicate because of async issues
	const annotationsWithDocs = new Map<string, Annotation>();
	for (const annotation of annotationsData.annotations) {
		annotationsWithDocs.set(annotation.uri, annotation);
	}
	const docsLoader = ora().start(`Loading ${annotationsWithDocs.size} docs...`);
	await Promise.all(Array.from(annotationsWithDocs.values()).map(docForAnnotation));
	docsLoader.succeed(`Loaded ${annotationsWithDocs.size} docs`);

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
