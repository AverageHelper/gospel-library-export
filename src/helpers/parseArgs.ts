import { finish } from "./finish.js";
import { parseArgs as _parseArgs } from "node:util";
import { version as packageVersion } from "../version.js";

const { values } = _parseArgs({
	options: {
		// Show the version, then exit
		version: { short: "v", type: "boolean", default: false }
	},
	strict: true
});

if (values.version) {
	console.info(`v${packageVersion}`);
	finish();
}
