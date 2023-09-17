import type { Folder, Tag } from "../structs/index.js";
import confirm from "@inquirer/confirm";

export async function shouldReturnToFolder(folder: Folder): Promise<boolean> {
	return await confirm({
		message: `Return to Notebook '${folder.name}'?`
	});
}

export async function shouldReturnToTag(tag: Tag): Promise<boolean> {
	return await confirm({
		message: `Return to Tag '${tag.name}'?`
	});
}

export async function shouldReturnToMenu(): Promise<boolean> {
	return await confirm({
		message: "Return to Menu?"
	});
}
