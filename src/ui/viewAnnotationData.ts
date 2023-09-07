import type { Annotation } from "../structs/index.js";
import inquirer from "inquirer";
import { finish } from "../helpers/finish.js";
import { header } from "../helpers/formatting.js";
import { presentAnnotation } from "./presentAnnotation.js";
import { requestCookie } from "./requestCookie.js";
import { selectAnnotation } from "./selectAnnotation.js";
import { selectFolder } from "./selectFolder.js";
import { selectTag } from "./selectTag.js";
import { shouldReturnToFolder, shouldReturnToMenu, shouldReturnToTag } from "./shouldReturn.js";
import { UnreachableCaseError } from "../helpers/UnreachableCaseError.js";

/**
 * A UI loop for viewing the given annotations. If no data is given, then
 * we will use churchofjesuschrist.org's API to view annotations.
 */
export async function viewAnnotationData(archive?: ReadonlyArray<Annotation>): Promise<void> {
	const tabs = [
		{
			name: "Notes",
			value: "notes"
		},
		{
			name: "Tags",
			value: "tags"
		},
		{
			name: "Notebooks",
			value: "notebooks"
		},
		{
			name: "Study Sets",
			value: "study-sets"
		}
	] as const;

	type Tab = (typeof tabs)[number]["value"];

	async function selectTab(): Promise<Tab> {
		const { tab } = await inquirer.prompt<{ tab: Tab }>({
			type: "list",
			name: "tab",
			message: "Select a tab:",
			choices: tabs
		});
		return tab;
	}

	if (!archive) {
		await requestCookie(true);
	}

	while (true) {
		const tab = await selectTab();

		switch (tab) {
			case "notebooks":
				// Select Notebook
				while (true) {
					const folder = await selectFolder(archive);
					if (!folder) break; // Assume the user requested to go up one level

					// Select annotation from folder
					while (true) {
						const annotation = await selectAnnotation(folder, archive);
						if (!annotation) break; // Assume the user requested to go up one level

						await presentAnnotation(annotation);

						// Next action?
						const returnOrExit = await shouldReturnToFolder(folder);
						if (!returnOrExit) finish();
					}
				}
				break;

			case "notes":
				// Select annotation
				while (true) {
					const annotation = await selectAnnotation(undefined, archive);
					if (!annotation) break; // Assume the user requested to go up one level

					await presentAnnotation(annotation);

					// Next action?
					const returnOrExit = await shouldReturnToMenu();
					if (!returnOrExit) finish();
				}
				break;

			case "tags":
				// Select tag
				while (true) {
					const tag = await selectTag();
					if (!tag) break; // Assume the user requested to go up one level

					// Select annotation from tag
					while (true) {
						const annotation = await selectAnnotation(tag, archive);
						if (!annotation) break; // Assume the user requested to go up one level

						await presentAnnotation(annotation);

						// Next action?
						const returnOrExit = await shouldReturnToTag(tag);
						if (!returnOrExit) finish();
					}
				}
				break;

			case "study-sets":
				console.info(header("Study Sets are not yet supported"));
				await new Promise(resolve => setTimeout(resolve, 500)); // Wait for user to read the message
				break;

			default:
				throw new UnreachableCaseError(tab);
		}
	}
}
