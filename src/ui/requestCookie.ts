import password from "@inquirer/password";
import { loader } from "./loader.js";

let previousCookie: string | null = null;

export async function requestCookie(fresh: boolean): Promise<string> {
	if (!fresh && previousCookie) return previousCookie;

	const ogLoaderText = loader.isSpinning ? loader.text : null;
	if (ogLoaderText) {
		loader.stopAndPersist();
	}

	if (previousCookie) {
		// We had a cookie, but we need a new one
		console.info(
			"Your login cookie has expired. Please reload your Notes window and copy a fresh 'Cookie' header to paste here:"
		);
	} else {
		// We didn't have a cookie before
		console.info("We need your login token in order to access your notes.");
		console.info(
			"Because I don't want to bother setting up OAuth to talk to churchofjesuschrist.org the 'proper' way, I'll ask you for your login cookie directly."
		);
		console.info("\t1. Log in to https://churchofjesuschrist.org/notes");
		console.info("\t2. Open browser devtools");
		console.info("\t3. Open Network inspector");
		console.info('\t4. Look for one of the requests to an endpoint that starts with "v3"');
		console.info("\t5. Find the 'Cookie' header sent in that request");
		console.info('\t6. Right click + "Copy Value"');
	}

	const Cookie = await password({
		message: "Paste your login cookie and press Enter"
	});

	// eslint-disable-next-line require-atomic-updates
	previousCookie = Cookie;

	if (ogLoaderText) {
		loader.start(ogLoaderText);
	}

	return Cookie;
}
