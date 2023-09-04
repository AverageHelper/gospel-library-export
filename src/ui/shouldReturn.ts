import type { Folder, Tag } from "../structs/index.js";
import inquirer from "inquirer";

export async function shouldReturnToFolder(folder: Folder): Promise<boolean> {
	const { returnToFolder } = await inquirer.prompt<{ returnToFolder: boolean }>({
		type: "confirm",
		name: "returnToFolder",
		message: `Return to Notebook '${folder.name}'?`
	});

	return returnToFolder;
}

export async function shouldReturnToTag(tag: Tag): Promise<boolean> {
	const { returnToTag } = await inquirer.prompt<{ returnToTag: boolean }>({
		type: "confirm",
		name: "returnToTag",
		message: `Return to Tag '${tag.name}'?`
	});

	return returnToTag;
}

export async function shouldReturnToMenu(): Promise<boolean> {
	const { returnToMenu } = await inquirer.prompt<{ returnToMenu: boolean }>({
		type: "confirm",
		name: "returnToMenu",
		message: "Return to Menu?"
	});

	return returnToMenu;
}
