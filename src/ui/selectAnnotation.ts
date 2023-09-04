import type { Annotation, Annotations, Folder, Tag } from "../structs/index.js";
import chunk from "lodash-es/chunk.js";
import inquirer from "inquirer";
import { loader } from "./loader.js";
import { requestCookie } from "./requestCookie.js";
import { truncated } from "../helpers/truncated.js";
import {
	allAnnotations,
	annotationsInFolder,
	annotationsWithTag,
	docForAnnotation
} from "../api.js";

async function loadAnnotations(
	getter: (startIndex?: number) => Promise<Annotations>
): Promise<Array<Annotation>> {
	const {
		annotationsTotal,
		annotationsCount: initialCount,
		annotations: initialAnnotations
	} = await getter();

	const annotations = new Array<Annotation>(annotationsTotal); // Array with slots pre-allocated
	let annotationsCount: number = initialCount;

	// Set the elements in-place
	for (const [index, annotation] of Object.entries(initialAnnotations)) {
		annotations[Number(index)] = annotation;
	}

	while (annotationsCount < annotationsTotal) {
		const annotationsData = await getter(annotationsCount);
		// Set the elements in-place, starting where we left off
		for (const [index, annotation] of Object.entries(annotationsData.annotations)) {
			annotations[Number(index) + annotationsCount] = annotation;
		}
		annotationsCount += annotationsData.annotationsCount;
		loader.start(`Loaded ${annotationsCount} of ${annotationsTotal} annotations...`);
	}

	return annotations;
}

async function annotationsFromUser(): Promise<Array<Annotation>> {
	return await loadAnnotations(async () => await allAnnotations(requestCookie));
}

async function annotationsFromTag(tag: Tag): Promise<Array<Annotation>> {
	return await loadAnnotations(async () => await annotationsWithTag(tag, requestCookie));
}

async function annotationsFromFolder(folder: Folder): Promise<Array<Annotation>> {
	return await loadAnnotations(async () => await annotationsInFolder(folder, requestCookie));
}

export async function selectAnnotation(folderOrTag?: Folder | Tag): Promise<Annotation | null> {
	let annotations: Array<Annotation>;

	if (!folderOrTag) {
		loader.start("Loading annotations...");
		annotations = await annotationsFromUser();
		loader.succeed(`${annotations.length} annotations`);
	} else if ("tagId" in folderOrTag) {
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
