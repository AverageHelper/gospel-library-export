import { array, number, optional, string, type } from "superstruct";
import { folder } from "./folders.js";

export const highlight = type({
	uri: optional(string()),
	pid: string(),
	color: string(),
	style: optional(string()),
	startOffset: number(),
	endOffset: number()
});

export const tag = type({}); // TODO: Figure out this shape

export const annotation = type({
	locale: string(),
	personId: string(),
	contentVersion: number(),
	docId: string(),
	note: optional(
		type({
			title: optional(string()),
			content: optional(string())
		})
	),
	source: string(),
	device: string(),
	created: string(),
	annotationId: string(),
	folders: array(folder),
	highlights: array(highlight),
	tags: array(tag),
	type: string(),
	uri: string(),
	lastUpdated: string()
});

export type Annotation = typeof annotation.TYPE;

export const annotations = type({
	annotations: array(annotation),
	annotationsCount: number(),
	annotationsTotal: number()
});

export type Annotations = typeof annotations.TYPE;
