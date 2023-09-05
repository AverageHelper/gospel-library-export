import type { Annotation, Folder, Folders } from "../structs/index.js";
import inquirer from "inquirer";
import { allFolders } from "../api.js";
import { Dim, Reset } from "../helpers/consoleColors.js";
import { loader } from "./loader.js";
import { requestCookie } from "./requestCookie.js";

function foldersFromAnnotations(archive: ReadonlyArray<Annotation>): Folders {
	const folders = new Map<string, Folder>();

	for (const annotation of archive) {
		for (const folder of annotation.folders) {
			folders.set(folder.folderId ?? "unassigned", folder);
		}
	}

	return Array.from(folders.values());
}

/**
 * Asks the user to select a folder from either the given archive or
 * from online at churchofjesuschrist.org.
 */
export async function selectFolder(archive?: ReadonlyArray<Annotation>): Promise<Folder | null> {
	loader.start("Loading Notebooks...");
	const foldersData = archive //
		? foldersFromAnnotations(archive)
		: await allFolders(requestCookie);
	loader.succeed(`${foldersData.length} Notebooks`);

	// Present list of Notebooks for user to choose from
	const { folder } = await inquirer.prompt<{ folder: Folder | "return" }>({
		type: "list",
		name: "folder",
		message: "Select a Notebook:",
		loop: false,
		choices: [{ name: `.. ${Dim}(Return)${Reset}`, value: "return" as string | Folder }].concat(
			foldersData.map(folder => ({
				name: `${folder.name} ${Dim}(${folder.annotationsCount})${Reset}`,
				value: folder
			}))
		)
	});

	if (folder === "return") return null;

	console.info(`Selected Notebook '${folder.name}' with ${folder.annotationsCount} annotations`);
	return folder;
}
