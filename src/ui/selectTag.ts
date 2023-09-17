import type { Tag } from "../structs/index.js";
import select from "@inquirer/select";
import { allTags } from "../api.js";
import { Dim, Reset } from "../helpers/consoleColors.js";
import { loader } from "./loader.js";
import { requestCookie } from "./requestCookie.js";

export async function selectTag(): Promise<Tag | null> {
	loader.start("Loading Tags...");
	const tagsData = await allTags(requestCookie);
	loader.succeed(`${tagsData.length} Tags`);

	// Present list of Notebooks for user to choose from
	const tag = await select<Tag | "return">({
		message: "Select a Tag:",
		choices: [{ name: `.. ${Dim}(Return)${Reset}`, value: "return" as Tag | "return" }].concat(
			tagsData.map(tag => ({
				name: `${tag.name} ${Dim}(${tag.annotationsCount})${Reset}`,
				value: tag
			}))
		)
	});

	if (tag === "return") return null;

	console.info(`Selected Tag '${tag.name}' with ${tag.annotationsCount} annotations`);
	return tag;
}
