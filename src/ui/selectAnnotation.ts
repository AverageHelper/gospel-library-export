import type { Annotation, Annotations, Folder, Tag } from "../structs/index.js";
import chunk from "lodash-es/chunk.js";
import select from "@inquirer/select";
import { Dim, Reset } from "../helpers/consoleColors.js";
import { loader } from "./loader.js";
import { requestCookie } from "./requestCookie.js";
import { truncated } from "../helpers/truncated.js";
import {
	allAnnotations,
	annotationsInFolder,
	annotationsWithTag,
	docForAnnotation
} from "../api.js";

function annotationsInArchive(
	archive: ReadonlyArray<Annotation>,
	startIndex: number,
	pageSize: number
): Annotations {
	const annotations = archive.slice(startIndex, startIndex + pageSize);
	return {
		annotations,
		annotationsCount: annotations.length,
		annotationsTotal: archive.length
	};
}

function annotationsForTagInArchive(
	archive: ReadonlyArray<Annotation>,
	tag: Tag,
	startIndex: number,
	pageSize: number
): Annotations {
	const annotationsWithTag = archive.filter(a => a.tags.some(t => t.tagId === tag.tagId));
	const annotations = annotationsWithTag.slice(startIndex, startIndex + pageSize);
	return {
		annotations,
		annotationsCount: annotations.length,
		annotationsTotal: annotationsWithTag.length
	};
}

function annotationsForFolderInArchive(
	archive: ReadonlyArray<Annotation>,
	folder: Folder,
	startIndex: number,
	pageSize: number
): Annotations {
	// Match website behavior: 'Unassigned Items' == all items
	if (!folder.folderId) return annotationsInArchive(archive, startIndex, pageSize);

	const annotationsInFolder = archive.filter(a =>
		a.folders.some(f => f.folderId === folder.folderId)
	);
	const annotations = annotationsInFolder.slice(startIndex, startIndex + pageSize);
	return {
		annotations,
		annotationsCount: annotations.length,
		annotationsTotal: annotationsInFolder.length
	};
}

/**
 * Asks the user to select an annotation from the set of annotations that
 * pertain to the given folder or tag. Searches either the given archive
 * or online at churchofjesuschrist.org.
 *
 * Document contents are always downloaded from churchofjesuschrist.org.
 */
export async function selectAnnotation(
	folderOrTag?: Folder | Tag,
	archive?: ReadonlyArray<Annotation>
): Promise<Annotation | null> {
	const PAGE_SIZE = 50;

	const pagesCache = new Map<number, Annotations>();
	let currentPage = 0;

	while (true) {
		let page: Annotations;
		const startIndex = PAGE_SIZE * currentPage;

		if (!folderOrTag) {
			loader.start("Loading annotations...");
			page =
				pagesCache.get(currentPage) ??
				(archive
					? annotationsInArchive(archive, startIndex, PAGE_SIZE)
					: await allAnnotations(requestCookie, startIndex, PAGE_SIZE));
			loader.succeed(`${page.annotationsCount} of ${page.annotationsTotal} annotations`);
		} else if ("tagId" in folderOrTag) {
			loader.start(`Loading annotations with Tag '${folderOrTag.name}'...`);
			page =
				pagesCache.get(currentPage) ??
				(archive
					? annotationsForTagInArchive(archive, folderOrTag, startIndex, PAGE_SIZE)
					: await annotationsWithTag(folderOrTag, requestCookie, startIndex, PAGE_SIZE));
			loader.succeed(
				`${page.annotationsCount} of ${page.annotationsTotal} annotations with Tag '${folderOrTag.name}'`
			);
		} else {
			loader.start(`Loading annotations in Notebook '${folderOrTag.name}'...`);
			page =
				pagesCache.get(currentPage) ??
				(archive
					? annotationsForFolderInArchive(archive, folderOrTag, startIndex, PAGE_SIZE)
					: await annotationsInFolder(folderOrTag, requestCookie, startIndex, PAGE_SIZE));
			loader.succeed(
				`${page.annotationsCount} of ${page.annotationsTotal} annotations in Notebook '${folderOrTag.name}'`
			);
		}

		pagesCache.set(currentPage, page);

		type ChoiceValue = Annotation | "return" | "next" | "previous";

		const CHUNK_SIZE = 5;
		loader.start(`Loading ${page.annotationsCount} annotations...`);
		const annotations = new Array<{ name: string; value: ChoiceValue }>(page.annotationsCount);

		let choicesLoaded = 0;
		for (const batch of chunk(page.annotations, CHUNK_SIZE)) {
			await Promise.all(
				Object.entries(batch).map(async ([index, annotation]) => {
					const name =
						annotation.note?.title ??
						(await docForAnnotation(annotation))?.headline ??
						annotation.annotationId;
					annotations[Number(index) + choicesLoaded] = {
						name: truncated(name, 64),
						value: annotation
					};
				})
			);
			choicesLoaded += batch.length;
			loader.start(`Prepared ${choicesLoaded} of ${page.annotationsCount} annotations...`);
		}
		loader.succeed(`Prepared ${page.annotationsCount} annotations`);

		// Present list of Annotations for user to choose from
		const choices = [{ name: `.. ${Dim}(Return)${Reset}`, value: "return" as ChoiceValue }];
		if (currentPage > 0) {
			choices.push({
				name: `${Dim}(To page ${currentPage}...)${Reset}`,
				value: "previous" as ChoiceValue
			});
		}
		choices.push(...annotations);
		choices.push({
			name: `${Dim}(To page ${currentPage + 2}...)${Reset}`,
			value: "next" as ChoiceValue
		});

		const annotationOrReturn = await select<ChoiceValue>({
			message: "Select an annotation:",
			choices
		});

		if (annotationOrReturn === "previous") {
			currentPage -= 1;
			continue; // prev page
		}

		if (annotationOrReturn === "next") {
			currentPage += 1;
			continue; // next page
		}

		if (annotationOrReturn === "return") return null; // prev menu

		return annotationOrReturn; // selected annotation
	}
}
