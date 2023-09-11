import "source-map-support/register.js";
import "./helpers/parseArgs.js";
import inquirer from "inquirer";
import { Dim, Reset } from "./helpers/consoleColors.js";
import { downloadAll, selectAndViewArchive, viewAnnotationData } from "./ui/index.js";
import { findArchives } from "./helpers/archives.js";
import { header } from "./helpers/formatting.js";
import { UnreachableCaseError } from "./helpers/UnreachableCaseError.js";

// ** UI Loop **

console.info(header("Gospel Library Notes Inspector"));

while (true) {
	type Action = "download" | "online" | "offline";

	const archives = await findArchives();

	const choices = [
		{
			name: "Download All Notes",
			value: "download"
		},
		{
			name: "View Notes Online",
			value: "online"
		}
	];

	if (archives.size > 0) {
		choices.unshift({
			name: `View Notes Offline ${Dim}(${archives.size} archive${
				archives.size === 1 ? "" : "s"
			})${Reset}`,
			value: "offline"
		});
	}

	const { action } = await inquirer.prompt<{ action: Action }>({
		type: "list",
		name: "action",
		message: "What would you like to do?",
		choices
	});

	switch (action) {
		case "download":
			// Download prod data to `./data` folder, then exit
			await downloadAll();
			break;

		case "online":
			// Emulate website for viewing online prod data
			await viewAnnotationData();
			break;

		case "offline":
			// Emulate website for viewing local archive data
			await selectAndViewArchive(archives);
			break;

		// TODO: Exit option?

		default:
			throw new UnreachableCaseError(action);
	}
}
