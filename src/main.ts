import "source-map-support/register.js";
import { parseArgs as _parseArgs } from "node:util";
import { version as packageVersion } from "./version.js";

const { values } = _parseArgs({
	options: {
		// Show the version, then exit
		version: { short: "v", type: "boolean", default: false }
	},
	strict: true
});

if (values.version) {
	// eslint-disable-next-line no-console
	console.info(`v${packageVersion}`);
} else {
	// eslint-disable-next-line no-console
	console.info("TODO: Do something here!");
}

// TODO: This is untestable. Reorganize parseArgs to a separate file; Change this test to check we call args; Test parseArgs that it returns the version flag when given.
