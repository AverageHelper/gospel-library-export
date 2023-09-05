import type { Annotation } from "../structs/index.js";
import { docForAnnotation, domain } from "../api.js";
import { header } from "../helpers/formatting.js";
import { join as joinPath } from "node:path";
import { parseXml } from "../helpers/parseXml.js";
import { requestCookie } from "./requestCookie.js";
import { UnreachableCaseError } from "../helpers/UnreachableCaseError.js";
import { URL } from "node:url";
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
} from "../helpers/consoleColors.js";

export async function presentAnnotation(annotation: Annotation): Promise<void> {
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
				case "pink":
					color = BgRed + Dim;
					break;
				case "orange":
					color = BgYellow + Dim;
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
					color = BgGreen + Dim;
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

			// i.e. "Red underline from word 18 to end"
			console.info(
				`${Bright}Highlight:${Reset} ${highlight.color} ${
					highlight.style === "red-underline" ? "underline" : "highlight"
				} from ${startOffset === -1 ? "start" : `word ${startOffset}`} to ${
					endOffset === -1 ? "end" : `word ${endOffset}`
				}`
			);
		}
	}

	console.info();

	const LIST_ITEM_SEPARATOR = ", ";

	// Present tags
	const tagsValue =
		annotation.tags.length === 0
			? `${Dim}(No tags)${Reset}`
			: annotation.tags.map(t => `${FgMagenta}${t.name}${Reset}`).join(LIST_ITEM_SEPARATOR);
	console.info(`${Bright}Tags:${Reset}       ${tagsValue}`);

	// Present Notebook membership
	const notebooksValue =
		annotation.folders.length === 0
			? `${Dim}(No notebooks)${Reset}`
			: annotation.folders.map(f => `${FgMagenta}${f.name}${Reset}`).join(LIST_ITEM_SEPARATOR);
	console.info(`${Bright}Notebooks:${Reset}  ${notebooksValue}`);
	console.info();
}
