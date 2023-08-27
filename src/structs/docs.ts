import { array, optional, record, string, type } from "superstruct";

export const doc = type({
	content: array(
		type({
			id: string(),
			markup: string(),
			displayId: optional(string())
		})
	),
	headline: string(),
	publication: string(),
	referenceURIDisplayText: string(),
	referenceURI: string(),
	type: string(),
	uri: string(),
	image: type({
		srcset: optional(string()),
		src: optional(string())
	}),
	idNotationUri: optional(string())
});

export type Doc = typeof doc.TYPE;

export const docs = record(string(), doc);
