import type { Annotation } from "./structs/index.js";
import "source-map-support/register.js";
import inquirer from "inquirer";
import { docForAnnotation, domain } from "./api.js";
import { header } from "./helpers/formatting.js";
import { join as joinPath } from "node:path";
import { parseArgs as _parseArgs } from "node:util";
import { parseXml } from "./helpers/parseXml.js";
import { UnreachableCaseError } from "./helpers/UnreachableCaseError.js";
import { URL } from "node:url";
import { version as packageVersion } from "./version.js";
import {
	requestCookie,
	selectAnnotation,
	selectFolder,
	selectTag,
	shouldReturnToFolder,
	shouldReturnToTag
} from "./ui/index.js";
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
		message: "Select a tab",
		choices: tabs
	});
	return tab;
}

async function presentAnnotation(annotation: Annotation): Promise<void> {
	// Present the note
	const doc = await docForAnnotation(annotation, requestCookie);

	console.info();
	console.info(header("Annotation"));
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

// ** UI Loop **

await requestCookie(true);

while (true) {
	const tab = await selectTab();

	switch (tab) {
		case "notebooks":
			// Select Notebook
			while (true) {
				const folder = await selectFolder();
				if (!folder) break; // Assume the user requested to go up one level

				// Select annotation from folder
				while (true) {
					const annotation = await selectAnnotation(folder);
					if (!annotation) break; // Assume the user requested to go up one level

					await presentAnnotation(annotation);

					// Next action?
					const returnToFolder = await shouldReturnToFolder(folder);
					if (!returnToFolder) break;
				}
			}
			break;

		case "notes":
			console.info("TODO: Notes");
			break;

		case "tags":
			// Select tag
			while (true) {
				const tag = await selectTag();
				if (!tag) break; // Assume the user requested to go up one level

				// Select annotation from tag
				while (true) {
					const annotation = await selectAnnotation(tag);
					if (!annotation) break; // Assume the user requested to go up one level

					await presentAnnotation(annotation);

					// Next action?
					const returnToFolder = await shouldReturnToTag(tag);
					if (!returnToFolder) break;
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

// TODO: Option to download everything to a JSON file
// TODO: Option to read from a local JSON file instead of churchofjesuschrist.org
