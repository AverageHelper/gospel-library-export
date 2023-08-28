import { parse } from "node-html-parser";

interface XmlParseResult {
	paragraph: string;
	verseNumber?: string;
}

export function parseXml(str: string): XmlParseResult {
	const json = parse(str);

	// Remove superscript letters from result
	json.querySelectorAll("sup").forEach(e => e.remove());

	const verseNumber = json.querySelector(".verse-number");
	let verseNumberText: string | undefined;
	if (verseNumber) {
		verseNumberText = verseNumber?.text.trim();
		verseNumber.remove();
	}

	const paragraph = json.text.trim();
	return { paragraph, verseNumber: verseNumberText };
}
