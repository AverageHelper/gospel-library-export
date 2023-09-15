import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

export const fs = {
	mkdir,
	async readdir(
		this: void,
		path: PathLike,
		options: {
			encoding?: BufferEncoding | null | undefined;
			withFileTypes: true;
			recursive?: boolean | undefined;
		}
	): Promise<Array<Dirent>> {
		return await readdir(path, options);
	},
	async readFile(this: void, path: PathOrFileDescriptor, options: BufferEncoding): Promise<string> {
		return await readFile(path, options);
	},
	writeFile
} as const;

export type FilesystemProxy = typeof fs;
export type { Dirent };
