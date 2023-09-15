import type { Dirent, PathLike } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

export const fs = {
	async mkdir(this: void, path: PathLike): Promise<void> {
		return await mkdir(path);
	},

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

	async readFile(this: void, path: PathLike, options: BufferEncoding): Promise<string> {
		return await readFile(path, options);
	},

	async writeFile(
		this: void,
		path: PathLike,
		data: string,
		options: { encoding?: BufferEncoding | null | undefined }
	) {
		return await writeFile(path, data, options);
	}
} as const;

export type FilesystemProxy = typeof fs;
export type { Dirent };
