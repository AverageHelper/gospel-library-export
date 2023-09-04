import type { Folder } from "../structs/index.js";
import inquirer from "inquirer";
import { allFolders } from "../api.js";
import { Dim, Reset } from "../helpers/consoleColors.js";
import { loader } from "./loader.js";
import { requestCookie } from "./requestCookie.js";

export async function selectFolder(): Promise<Folder | null> {
	loader.start("Loading Notebooks...");
	const foldersData = await allFolders(requestCookie);
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
