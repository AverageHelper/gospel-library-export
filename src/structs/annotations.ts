import { array, enums, number, optional, string, type } from "superstruct";
import { folder } from "./folders.js";

// These are all of the values I've seen from the API. If you see a console error
// complaining about a new one, be sure to add it here and handle it appropriately.
export const color = enums([
	"red",
	"pink",
	"orange",
	"yellow",
	"green",
	"blue",
	"dark_blue",
	"purple",
	"brown",
	"gray",
	"clear"
]);

// I have not seen other style values in the API. Apparently, `red-underline` is a
// legacy value. The API now reports color and style values separately.
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

export type Tag = typeof tag.TYPE;

export const tags = array(tag);

export const annotation = type({
	locale: string(),
	personId: string(),
	contentVersion: optional(number()),
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
