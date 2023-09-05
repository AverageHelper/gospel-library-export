import "source-map-support/register.js";
import inquirer from "inquirer";
import { finish } from "./helpers/finish.js";
import { header } from "./helpers/formatting.js";
import { UnreachableCaseError } from "./helpers/UnreachableCaseError.js";
import {
	presentAnnotation,
	requestCookie,
	selectAnnotation,
	selectFolder,
	selectTag,
	shouldReturnToFolder,
	shouldReturnToMenu,
	shouldReturnToTag
} from "./ui/index.js";

type Action = "download" | "online" | "offline";

const actions: Array<{ name: string; value: Action }> = [
	{
		name: "View Online",
		value: "online"
	}
];

// TODO: Check for a file in the special dir
// TODO: If found, add View Offline option for viewing

actions.push({
	name: "View Offline",
	value: "offline"
});
actions.push({
	name: "Download All",
	value: "download"
});

async function viewOnline(): Promise<void> {
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

	await requestCookie(true);

	while (true) {
		const tab = await selectTab();

		switch (tab) {
			case "notebooks":
				// Select Notebook
				while (true) {
					const folder = await selectFolder();
					if (!folder) break; // Assume the user requested to go up one level

					// Select annotation from folder
					while (true) {
						const annotation = await selectAnnotation(folder);
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
					const annotation = await selectAnnotation();
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
						const annotation = await selectAnnotation(tag);
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

// ** UI Loop **

console.info(header("Gospel Library Notes Inspector"));

while (true) {
	const { action } = await inquirer.prompt<{ action: Action }>({
		type: "list",
		name: "action",
		message: "What would you like to do?",
		choices: actions
	});

	switch (action) {
		case "download":
			// Sit quiet and download, then exit
			console.log(header("Archival is not yet implemented"));
			await new Promise(resolve => setTimeout(resolve, 500)); // Wait for user to read the message
			break;

		case "online":
			// Normal online viewing
			await viewOnline();
			break;

		case "offline":
			// Special offline viewing from data from file
			console.log(header("Offline viewing is not yet implemented"));
			await new Promise(resolve => setTimeout(resolve, 500)); // Wait for user to read the message
			break;

		default:
			throw new UnreachableCaseError(action);
	}
}
