// Node 18 implements the `fetch` API globally, but @types/node doesn't know that yet.
// For updates, see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924
// Inspired by https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924#issuecomment-1563447168

import type * as undici from "undici";

declare global {
	// Re-export undici fetch function and various classes to global scope.
	// These are classes and functions expected to be at global scope according to
	// Node.js v18 API documentation.
	// See: https://nodejs.org/dist/latest-v18.x/docs/api/globals.html
	export const { FormData, Headers, Request, Response, fetch }: typeof undici;
	export type { FormData, Headers, Request, RequestInit, Response } from "undici";
}
