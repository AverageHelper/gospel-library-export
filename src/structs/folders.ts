import { array, number, optional, string, type } from "superstruct";

export const folder = type({
	created: optional(string()),
	lastAddedDate: string(),
	name: string(),
	annotationsCount: number(),
	folderId: optional(string()),
	orderedAnnotationIds: array(string())
});

export type Folder = typeof folder.TYPE;

export const folders = array(folder);
