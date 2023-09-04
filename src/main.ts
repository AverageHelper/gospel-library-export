import "source-map-support/register.js";
import inquirer from "inquirer";
import { header } from "./helpers/formatting.js";
import { parseArgs as _parseArgs } from "node:util";
import { UnreachableCaseError } from "./helpers/UnreachableCaseError.js";
import { version as packageVersion } from "./version.js";
import {
	presentAnnotation,
	requestCookie,
	selectAnnotation,
	selectFolder,
	selectTag,
	shouldReturnToFolder,
	shouldReturnToTag
} from "./ui/index.js";

const { values } = _parseArgs({
	options: {
		// Show the version, then exit
		version: { short: "v", type: "boolean", default: false }
	},
	strict: true
});

function finish(): never {
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
}

if (values.version) {
	console.info(`v${packageVersion}`);
	finish();
}

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
		message: "Select a tab",
		choices: tabs
	});
	return tab;
}

// ** UI Loop **

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
			console.info("TODO: Notes");
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

// TODO: Option to download everything to a JSON file
// TODO: Option to read from a local JSON file instead of churchofjesuschrist.org
