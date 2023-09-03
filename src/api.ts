import type { Annotation, Annotations, Doc, Folder } from "./structs/index.js";
import { assert } from "superstruct";
import { annotations, docs, folders } from "./structs/index.js";
import { URL } from "node:url";

/**
 * @param fresh Whether to fetch an entirely new cookie, usually in the
 * event that a previously-given cookie has expired.
 */
export type FetchCookie = (fresh: boolean) => string | Promise<string>;

async function doRequest(
	api: URL,
	requestCookie: FetchCookie,
	initSansCookie: RequestInit
): Promise<Response> {
	const Cookie = await requestCookie(false);
	const res = await fetch(api, {
		...initSansCookie,
		headers: { ...initSansCookie.headers, Cookie }
	});

	switch (res.status) {
		case 200:
			return res;

		case 401: {
			const Cookie = await requestCookie(true);
			const res = await fetch(api, {
				...initSansCookie,
				headers: { ...initSansCookie.headers, Cookie }
			});
			if (!res.ok) throw new Error(`STATUS: ${res.status}`);
			return res;
		}

		default:
			throw new Error(`STATUS: ${res.status}`);
	}
}

export const domain = new URL("https://www.churchofjesuschrist.org");

const docsCache = new Map<string, Doc>();

/**
 * @returns The doc associated with the given annotation.
 */
export async function docForAnnotation(
	annotation: Annotation,
	requestCookie: FetchCookie
): Promise<Doc> {
	const uri = annotation.highlights[0]?.uri;
	if (!uri) throw new Error(`Annotation '${annotation.annotationId}' has no highlights with URI`);

	const extantDoc = docsCache.get(uri);
	if (extantDoc) return extantDoc;

	const docsApi = new URL("/content/api/v3", domain);
	docsApi.searchParams.set("uris", uri);
	docsApi.searchParams.set("lang", annotation.locale);

	const res = await doRequest(docsApi, requestCookie, {
		credentials: "include",
		headers: {
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.5",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache"
		},
		method: "GET",
		mode: "cors"
	});

	const docsData = await res.json();
	assert(docsData, docs);

	const doc = docsData[uri];
	if (!doc) throw new Error(`No doc for URI '${uri}': ${JSON.stringify(docsData)}`);

	docsCache.set(uri, doc);
	return doc;
}

let foldersCache: ReadonlyArray<Folder> | undefined;

/**
 * @returns All of the user's annotations folders from churchofjesuschrist.org
 */
export async function allFolders(requestCookie: FetchCookie): Promise<Array<Folder>> {
	if (foldersCache) return structuredClone(foldersCache).slice();

	const foldersApi = new URL("/notes/api/v3/folders", domain);
	foldersApi.searchParams.set("setId", "all");

	const res = await doRequest(foldersApi, requestCookie, {
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Accept-Language": "en-US,en;q=0.5",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache"
		},
		method: "GET",
		mode: "cors"
	});

	const foldersData = await res.json();
	assert(foldersData, folders);

	// eslint-disable-next-line require-atomic-updates
	foldersCache = foldersData;
	return foldersData;
}

const annotationsCache = new Map<string, Annotations>();

/**
 * @param folder The folder to search.
 * @returns All annotations associated with the given folder.
 */
export async function annotationsInFolder(
	folder: Folder,
	requestCookie: FetchCookie,
	startIndex: number = 0
): Promise<Annotations> {
	const extantAnnotations = annotationsCache.get(folder.folderId ?? folder.name);
	if (extantAnnotations) return extantAnnotations;

	const annotationsApi = new URL("/notes/api/v3/annotationsWithMeta", domain);
	if (folder.folderId) {
		// Omit `folderId` for Unassigned Notes
		annotationsApi.searchParams.set("folderId", folder.folderId);
	}
	annotationsApi.searchParams.set("setId", "all");
	if (startIndex > 0) {
		annotationsApi.searchParams.set("start", `${startIndex + 1}`);
	}
	annotationsApi.searchParams.set("type", "journal,reference,highlight");
	annotationsApi.searchParams.set("numberToReturn", "50");

	const res = await doRequest(annotationsApi, requestCookie, {
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Accept-Language": "en-US,en;q=0.5",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache"
		},
		method: "GET",
		mode: "cors"
	});

	const annotationsData = await res.json();
	assert(annotationsData, annotations);

	annotationsCache.set(folder.folderId ?? folder.name, annotationsData);
	return annotationsData;
}
