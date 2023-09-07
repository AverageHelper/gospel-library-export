import type { Dirent } from "node:fs";
import { dataDir, findArchives } from "./archives.js";
import { resolve as resolvePath } from "node:path";

vi.mock("../ui/index.js");

import { loader } from "../ui/index.js";

/* eslint-disable @typescript-eslint/unbound-method */
const mockLoaderInfo = loader.info as Mock<typeof loader.info>;
const mockLoaderStart = loader.start as Mock<typeof loader.start>;
const mockLoaderFail = loader.fail as Mock<typeof loader.fail>;
const mockLoaderSucceed = loader.succeed as Mock<typeof loader.succeed>;
/* eslint-enable @typescript-eslint/unbound-method */

vi.mock("node:fs/promises");

import { mkdir, readdir, readFile } from "node:fs/promises";

const mockMkdir = mkdir as Mock<typeof mkdir>;
const mockReaddir = readdir as unknown as Mock<typeof readdir>;
const mockReadFile = readFile as Mock<typeof readFile>;

describe("Local Archives", () => {
	const testDirEnt: Dirent = {
		path: dataDir.pathname,
		name: "foo.json",
		isFile: () => true,
		isDirectory: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isFIFO: () => false,
		isSocket: () => false,
		isSymbolicLink: () => false
	};

	beforeEach(() => {
		mockReaddir.mockRejectedValue(new Error("ENOENT"));
		mockReadFile.mockRejectedValue(new Error("ENOENT"));
	});

	test("dataDir is a local file in a folder called `data`", () => {
		expect(dataDir.protocol).toBe("file:");
		expect(dataDir.pathname).toEndWith("/data");
	});

	test("throws filesystem errors from reading the directory", async () => {
		const error = new Error("something went wrong");
		mockReaddir.mockRejectedValue(error);

		await expect(findArchives()).rejects.toBe(error);

		expect(mockMkdir).not.toHaveBeenCalled();
		expect(mockReadFile).not.toHaveBeenCalled();
	});

	test("creates a data directory if it doesn't already exist", async () => {
		// Returns empty map
		await expect(findArchives()).resolves.toMatchObject(new Map());

		expect(mockReaddir).toHaveBeenCalledExactlyOnceWith(dataDir, {
			encoding: "utf-8",
			recursive: false,
			withFileTypes: true
		});

		// Directory gets made
		expect(mockMkdir).toHaveBeenCalledOnce();

		// Logs happen appropriately
		expect(mockLoaderStart).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`Checking '${dataDir.pathname}'`)
		);
		expect(mockLoaderFail).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining("0 valid archives")
		);
		expect(mockLoaderInfo).toHaveBeenCalledExactlyOnceWith(
			`Created archive directory at '${dataDir.pathname}'`
		);
		expect(mockLoaderSucceed).not.toHaveBeenCalled();
	});

	test("returns an empty map if the data directory is empty", async () => {
		mockReaddir.mockResolvedValue([]);

		await expect(findArchives()).resolves.toMatchObject(new Map());

		expect(mockReaddir).toHaveBeenCalledExactlyOnceWith(dataDir, {
			encoding: "utf-8",
			recursive: false,
			withFileTypes: true
		});

		// Directory doesn't get remade
		expect(mockMkdir).not.toHaveBeenCalled();

		// Logs happen appropriately
		expect(mockLoaderStart).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`Checking '${dataDir.pathname}'`)
		);
		expect(mockLoaderFail).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining("0 valid archives")
		);
		expect(mockLoaderInfo).not.toHaveBeenCalled();
		expect(mockLoaderSucceed).not.toHaveBeenCalled();
	});

	test("returns an empty map if all of the files are unreadable", async () => {
		mockReaddir.mockResolvedValue([testDirEnt]);
		mockReadFile.mockRejectedValue(new Error("something went wrong")); // file unreadable for some reason
		const filePath = resolvePath(testDirEnt.path, testDirEnt.name);

		await expect(findArchives()).resolves.toMatchObject(new Map());

		expect(mockReaddir).toHaveBeenCalledExactlyOnceWith(dataDir, {
			encoding: "utf-8",
			recursive: false,
			withFileTypes: true
		});

		// Directory doesn't get remade
		expect(mockMkdir).not.toHaveBeenCalled();

		// Logs happen appropriately
		expect(mockLoaderStart).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`Checking '${dataDir.pathname}'`)
		);
		expect(mockLoaderFail).toHaveBeenCalledTimes(2);
		expect(mockLoaderFail).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining(`Archive at '${filePath}' is not valid`)
		);
		expect(mockLoaderFail).toHaveBeenNthCalledWith(2, expect.stringContaining("0 valid archives"));
		expect(mockLoaderInfo).not.toHaveBeenCalled();
		expect(mockLoaderSucceed).not.toHaveBeenCalled();
	});

	test("returns an empty map if all files are not JSON", async () => {
		mockReaddir.mockResolvedValue([testDirEnt]);
		mockReadFile.mockResolvedValue("Lorem Ipsum"); // not valid JSON
		const filePath = resolvePath(testDirEnt.path, testDirEnt.name);

		await expect(findArchives()).resolves.toMatchObject(new Map());

		// Directory doesn't get remade
		expect(mockMkdir).not.toHaveBeenCalled();

		// Logs happen appropriately
		expect(mockLoaderStart).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`Checking '${dataDir.pathname}'`)
		);
		expect(mockLoaderFail).toHaveBeenCalledTimes(2);
		expect(mockLoaderFail).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining(`Archive at '${filePath}' is not valid`)
		);
		expect(mockLoaderFail).toHaveBeenNthCalledWith(2, expect.stringContaining("0 valid archives"));
		expect(mockLoaderInfo).not.toHaveBeenCalled();
		expect(mockLoaderSucceed).not.toHaveBeenCalled();
	});

	test("returns an empty map if all files are not well-formed archives", async () => {
		mockReaddir.mockResolvedValue([testDirEnt]);
		mockReadFile.mockResolvedValue(JSON.stringify({})); // not a valid archive
		const filePath = resolvePath(testDirEnt.path, testDirEnt.name);

		await expect(findArchives()).resolves.toMatchObject(new Map());

		// Directory doesn't get remade
		expect(mockMkdir).not.toHaveBeenCalled();

		// Logs happen appropriately
		expect(mockLoaderStart).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`Checking '${dataDir.pathname}'`)
		);
		expect(mockLoaderFail).toHaveBeenCalledTimes(2);
		expect(mockLoaderFail).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining(`Archive at '${filePath}' is not valid`)
		);
		expect(mockLoaderFail).toHaveBeenNthCalledWith(2, expect.stringContaining("0 valid archives"));
		expect(mockLoaderInfo).not.toHaveBeenCalled();
		expect(mockLoaderSucceed).not.toHaveBeenCalled();
	});

	test("returns a map containing the given archive", async () => {
		mockReaddir.mockResolvedValue([testDirEnt]);
		mockReadFile.mockResolvedValue(JSON.stringify([])); // empty archive
		const filePath = resolvePath(testDirEnt.path, testDirEnt.name);

		const result = await findArchives();
		expect(result).toBeInstanceOf(Map);
		expect(result.size).toBe(1);
		expect(result.get(filePath)).toMatchObject([]);

		// Directory doesn't get remade
		expect(mockMkdir).not.toHaveBeenCalled();

		// Logs happen appropriately
		expect(mockLoaderStart).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`Checking '${dataDir.pathname}'`)
		);
		expect(mockLoaderFail).not.toHaveBeenCalled();
		expect(mockLoaderInfo).not.toHaveBeenCalled();
		expect(mockLoaderSucceed).toHaveBeenCalledExactlyOnceWith("Found 1 valid archive");
	});
});
