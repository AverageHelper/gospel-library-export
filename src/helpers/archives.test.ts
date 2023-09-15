import type { Mock } from "bun:test";
import { mock, spyOn } from "bun:test";
import { dataDir, findArchives } from "./archives.js";
import { resolve as resolvePath } from "node:path";

import { loader } from "../ui/index.js";
const mockLoaderInfo = spyOn(loader, "info");
const mockLoaderStart = spyOn(loader, "start");
const mockLoaderFail = spyOn(loader, "fail");
const mockLoaderSucceed = spyOn(loader, "succeed");

import type { Dirent, FilesystemProxy } from "../helpers/fs.js";
const testFs: FilesystemProxy = {
	mkdir: mock(() => Promise.resolve(undefined)),
	readdir: mock(() => Promise.resolve([])),
	readFile: mock(() => Promise.reject(new Error("ENOENT"))),
	writeFile: mock(() => Promise.resolve(undefined))
};

const mockMkdir = testFs.mkdir as Mock<typeof testFs.mkdir>;
const mockReaddir = testFs.readdir as Mock<typeof testFs.readdir>;
const mockReadFile = testFs.readFile as Mock<typeof testFs.readFile>;

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

		await expect(findArchives(testFs)).rejects.toBe(error);

		expect(mockMkdir).not.toHaveBeenCalled();
		expect(mockReadFile).not.toHaveBeenCalled();
	});

	test("creates a data directory if it doesn't already exist", async () => {
		// Returns empty map
		await expect(findArchives(testFs)).resolves.toMatchObject(new Map());

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

		await expect(findArchives(testFs)).resolves.toMatchObject(new Map());

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

		await expect(findArchives(testFs)).resolves.toMatchObject(new Map());

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

		await expect(findArchives(testFs)).resolves.toMatchObject(new Map());

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

		await expect(findArchives(testFs)).resolves.toMatchObject(new Map());

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

		const result = await findArchives(testFs);
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
