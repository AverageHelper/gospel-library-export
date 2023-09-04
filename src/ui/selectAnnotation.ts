import type { Annotation, Folder, Tag } from "../structs/index.js";
import chunk from "lodash-es/chunk.js";
import inquirer from "inquirer";
import { annotationsInFolder, annotationsWithTag, docForAnnotation } from "../api.js";
import { loader } from "./loader.js";
import { requestCookie } from "./requestCookie.js";
import { truncated } from "../helpers/truncated.js";

async function annotationsFromFolder(folder: Folder): Promise<Array<Annotation>> {
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
		loader.start(`Loaded ${annotationsCount} of ${annotationsTotal} annotations...`);
	}

	return annotations;
}

async function annotationsFromTag(tag: Tag): Promise<Array<Annotation>> {
	const {
		annotationsTotal,
		annotationsCount: initialCount,
		annotations: initialAnnotations
	} = await annotationsWithTag(tag, requestCookie);

	const annotations = new Array<Annotation>(annotationsTotal); // Array with slots pre-allocated
	let annotationsCount: number = initialCount;

	// Set the elements in-place
	for (const [index, annotation] of Object.entries(initialAnnotations)) {
		annotations[Number(index)] = annotation;
	}

	while (annotationsCount < annotationsTotal) {
		const annotationsData = await annotationsWithTag(tag, requestCookie, annotationsCount);
		// Set the elements in-place, starting where we left off
		for (const [index, annotation] of Object.entries(annotationsData.annotations)) {
			annotations[Number(index) + annotationsCount] = annotation;
		}
		annotationsCount += annotationsData.annotationsCount;
		loader.start(`Loaded ${annotationsCount} of ${annotationsTotal} annotations...`);
	}

	return annotations;
}

export async function selectAnnotation(folderOrTag: Folder | Tag): Promise<Annotation | null> {
	let annotations: Array<Annotation>;

	if ("tagId" in folderOrTag) {
		loader.start(`Loading annotations with Tag '${folderOrTag.name}'...`);
		annotations = await annotationsFromTag(folderOrTag);
		loader.succeed(`${annotations.length} annotations with Tag '${folderOrTag.name}'`);
	} else {
		loader.start(`Loading annotations in Notebook '${folderOrTag.name}'...`);
		annotations = await annotationsFromFolder(folderOrTag);
		loader.succeed(`${annotations.length} annotations in Notebook '${folderOrTag.name}'`);
	}

	const CHUNK_SIZE = 5;
	loader.start(`Loading ${annotations.length} annotations...`);
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
					name: truncated(name, 64),
					value: annotation,
					type: "choice"
				};
			})
		);
		choicesLoaded += batch.length;
		loader.start(`Prepared ${choicesLoaded} of ${annotations.length} annotations...`);
	}
	loader.succeed(`Prepared ${annotations.length} annotations`);

	// Present list of Annotations for user to choose from
	const { annotationOrReturn } = await inquirer.prompt<{
		annotationOrReturn: Annotation | "return";
	}>({
		type: "list",
		name: "annotationOrReturn",
		message: `${annotations.length} Annotations`,
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
