import type { Annotation, Annotations, Doc, Folder } from "./structs/index.js";
import { assert } from "superstruct";
import { annotations, docs, folders } from "./structs/index.js";
import { URL } from "node:url";

const Cookie = ""; // Paste the value of your `Cookie` header here

export const domain = new URL("https://www.churchofjesuschrist.org");

const docsCache = new Map<string, Doc>();

/**
 * @returns The doc associated with the given annotation.
 */
export async function docForAnnotation(annotation: Annotation): Promise<Doc> {
	const uri = annotation.highlights[0]?.uri;
	if (!uri) throw new Error(`Annotation '${annotation.annotationId}' has no highlights with URI`);

	const extantDoc = docsCache.get(uri);
	if (extantDoc) return extantDoc;

	const docsApi = new URL("/content/api/v3", domain);
	docsApi.searchParams.set("uris", uri);
	docsApi.searchParams.set("lang", annotation.locale);

	const docsRes = await fetch(docsApi, {
		credentials: "include",
		headers: {
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.5",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			Cookie
		},
		method: "GET",
		mode: "cors"
	});

	if (!docsRes.ok) throw new Error(`STATUS: ${docsRes.status}`);

	const docsData = await docsRes.json();
	assert(docsData, docs);

	const doc = docsData[uri];
	if (!doc) throw new Error(`No doc for URI '${uri}': ${JSON.stringify(docsData)}`);

	docsCache.set(uri, doc);
	return doc;
}

/**
 * @returns All of the user's annotations folders from churchofjesuschrist.org
 */
export async function allFolders(): Promise<Array<Folder>> {
	const foldersApi = new URL("/notes/api/v3/folders", domain);
	foldersApi.searchParams.set("setId", "all");

	const foldersRes = await fetch(foldersApi, {
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Accept-Language": "en-US,en;q=0.5",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			Cookie
		},
		method: "GET",
		mode: "cors"
	});

	if (!foldersRes.ok) throw new Error(`STATUS: ${foldersRes.status}`);

	const foldersData = await foldersRes.json();
	assert(foldersData, folders);

	return foldersData;
}

/**
 * @param folder The folder to search.
 * @returns All annotations associated with the given folder.
 */
export async function annotationsInFolder(folder: Folder): Promise<Annotations> {
	const annotationsApi = new URL("/notes/api/v3/annotationsWithMeta", domain);
	if (folder.folderId) {
		// Omit `folderId` for Unassigned Notes
		annotationsApi.searchParams.set("folderId", folder.folderId);
	}
	annotationsApi.searchParams.set("setId", "all");
	annotationsApi.searchParams.set("type", "journal,reference,highlight");
	annotationsApi.searchParams.set("numberToReturn", "50");

	const annotationsRes = await fetch(annotationsApi, {
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Accept-Language": "en-US,en;q=0.5",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			Cookie
		},
		method: "GET",
		mode: "cors"
	});

	if (!annotationsRes.ok) throw new Error(`STATUS: ${annotationsRes.status}`);

	const annotationsData = await annotationsRes.json();
	assert(annotationsData, annotations);

	return annotationsData;
}
