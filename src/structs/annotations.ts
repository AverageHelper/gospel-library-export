import { array, enums, number, optional, string, type } from "superstruct";
import { folder } from "./folders.js";

// I have also seen `dark_blue`, `purple`, and `pink` in the annotation selector, but these were class names in the DOM. Not sure that the API uses the same spelling.
export const color = enums(["red", "orange", "yellow", "green", "blue", "brown", "gray", "clear"]);

// I have not seen other style values. Apparently, `red-underline` is a legacy value. The API now reports color and style separately.
export const style = enums(["red-underline"]);

export const highlight = type({
	uri: optional(string()),
	pid: string(),
	color: color,
	style: optional(style),
	startOffset: number(),
	endOffset: number()
});

export const tag = type({
	tagId: string(),
	name: string(),
	timestamp: string(),
	created: string(),
	annotationsCount: number()
});

export const annotation = type({
	locale: string(),
	personId: string(),
	contentVersion: number(),
	docId: optional(string()),
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
	highlights: optional(array(highlight)),
	tags: array(tag),
	type: string(),
	uri: optional(string()),
	lastUpdated: string()
});

export type Annotation = typeof annotation.TYPE;

export const annotations = type({
	annotations: array(annotation),
	annotationsCount: number(),
	annotationsTotal: number()
});

export type Annotations = typeof annotations.TYPE;
