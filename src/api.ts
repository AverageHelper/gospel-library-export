import type { Annotation, Annotations, Doc, Folder, Tag } from "./structs/index.js";
import { annotations, docs, folders, tags } from "./structs/index.js";
import { assert } from "superstruct";
import { URL } from "node:url";

const DEFAULT_PAGE_SIZE = 50;

/**
 * @param fresh Whether to fetch an entirely new cookie, usually in the
 * event that a previously-given cookie has expired.
 */
export type FetchCookie = (fresh: boolean) => string | Promise<string>;

async function doRequest(
	api: URL,
	requestCookie: FetchCookie | false,
	initSansCookie: RequestInit
): Promise<Response> {
	const Cookie = requestCookie ? await requestCookie(false) : null;
	const headers = Cookie ? { ...initSansCookie.headers, Cookie } : initSansCookie.headers;
	const res = await fetch(api, {
		...initSansCookie,
		headers
	});

	switch (res.status) {
		case 200:
			return res;

		case 401: {
			if (requestCookie) {
				const Cookie = await requestCookie(true);
				const res = await doRequest(api, requestCookie, {
					...initSansCookie,
					headers: { ...initSansCookie.headers, Cookie }
				});
				if (!res.ok) throw new Error(`STATUS: ${res.status}`);
			}
			return res;
		}

		default:
			throw new Error(`STATUS: ${res.status}`);
	}
}

export const domain = new URL("https://www.churchofjesuschrist.org");

const docsCacheByAnnotation = new Map<string, Doc>();

/**
 * @returns The doc associated with the given annotation, if one exists.
 */
export async function docForAnnotation(annotation: Annotation): Promise<Doc | null> {
	const uri = annotation.highlights?.[0]?.uri;
	if (!uri) return null;

	const extantDoc = docsCacheByAnnotation.get(uri);
	if (extantDoc) return extantDoc;

	const docsApi = new URL("/content/api/v3", domain);
	docsApi.searchParams.set("uris", uri);
	docsApi.searchParams.set("lang", annotation.locale);

	const res = await doRequest(docsApi, false, {
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

	const docsData = await res.json<unknown>();
	assert(docsData, docs);

	const doc = docsData[uri];
	if (!doc) throw new Error(`No doc for URI '${uri}': ${JSON.stringify(docsData)}`);

	docsCacheByAnnotation.set(uri, doc);
	return doc;
}

const tagsCacheById = new Map<string, Tag>();

/**
 * @returns All of the user's annotation tags from churchofjesuschrist.org
 */
export async function allTags(requestCookie: FetchCookie): Promise<Array<Tag>> {
	if (tagsCacheById.size > 0) return Array.from(tagsCacheById.values());

	const tagsApi = new URL("/notes/api/v3/tags", domain);

	const res = await doRequest(tagsApi, requestCookie, {
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

	const tagsData = await res.json<unknown>();
	assert(tagsData, tags);

	for (const tag of tagsData) {
		tagsCacheById.set(tag.tagId, tag);
	}
	return tagsData;
}

const foldersCacheById = new Map<string, Folder>();

/**
 * @returns All of the user's annotations folders from churchofjesuschrist.org
 */
export async function allFolders(requestCookie: FetchCookie): Promise<Array<Folder>> {
	if (foldersCacheById.size > 0) return Array.from(foldersCacheById.values());

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

	const foldersData = await res.json<unknown>();
	assert(foldersData, folders);

	for (const folder of foldersData) {
		foldersCacheById.set(folder.folderId ?? "unassigned", folder);
	}
	return foldersData;
}

/**
 * @param folder The folder to search.
 * @returns All annotations associated with the given folder, or all annotations for the
 * user if the folder has no `folderId` (i.e. the 'Unassigned Notes` folder).
 */
export async function annotationsInFolder(
	folder: Folder,
	requestCookie: FetchCookie,
	startIndex: number = 0,
	pageSize: number = DEFAULT_PAGE_SIZE
): Promise<Annotations> {
	if (!folder.folderId) {
		// The API for the 'Unassigned Notes' folder omits `folderId`, which is identical to
		// the fetch-all-notes endpoint. This is silly, but not something we can help here
		// at the API layer.
		return await allAnnotations(requestCookie, startIndex);
	}

	const annotationsApi = new URL("/notes/api/v3/annotationsWithMeta", domain);
	annotationsApi.searchParams.set("folderId", folder.folderId);
	annotationsApi.searchParams.set("setId", "all");
	if (startIndex > 0) {
		annotationsApi.searchParams.set("start", `${startIndex + 1}`);
	}
	annotationsApi.searchParams.set("type", "journal,reference,highlight");
	annotationsApi.searchParams.set("numberToReturn", `${pageSize}`);

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

	const annotationsData = await res.json<unknown>();
	assert(annotationsData, annotations);

	return structuredClone(annotationsData);
}

/**
 * @param tag The tag to search.
 * @returns All annotations associated with the given tag.
 */
export async function annotationsWithTag(
	tag: Tag,
	requestCookie: FetchCookie,
	startIndex: number = 0,
	pageSize: number = DEFAULT_PAGE_SIZE
): Promise<Annotations> {
	const annotationsApi = new URL("/notes/api/v3/annotationsWithMeta", domain);
	annotationsApi.searchParams.set("tagId", tag.tagId);
	annotationsApi.searchParams.set("tags", tag.tagId);
	annotationsApi.searchParams.set("setId", "all");
	if (startIndex > 0) {
		annotationsApi.searchParams.set("start", `${startIndex + 1}`);
	}
	annotationsApi.searchParams.set("type", "journal,reference,highlight");
	annotationsApi.searchParams.set("numberToReturn", `${pageSize}`);

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

	const annotationsData = await res.json<unknown>();
	assert(annotationsData, annotations);

	return structuredClone(annotationsData);
}

/**
 * @returns All annotations associated with the user.
 */
export async function allAnnotations(
	requestCookie: FetchCookie,
	startIndex: number = 0,
	pageSize: number = DEFAULT_PAGE_SIZE
): Promise<Annotations> {
	const annotationsApi = new URL("/notes/api/v3/annotationsWithMeta", domain);
	annotationsApi.searchParams.set("setId", "all");
	if (startIndex > 0) {
		annotationsApi.searchParams.set("start", `${startIndex + 1}`);
	}
	annotationsApi.searchParams.set("type", "journal,reference,highlight");
	annotationsApi.searchParams.set("numberToReturn", `${pageSize}`);

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

	const annotationsData = await res.json<unknown>();
	assert(annotationsData, annotations);

	return structuredClone(annotationsData);
}
