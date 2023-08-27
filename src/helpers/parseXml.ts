import { parse } from "node-html-parser";

export function parseXml(str: string): string {
	const json = parse(str);

	// Remove superscript letters from result
	json.querySelectorAll("sup").forEach(e => e.remove());

	return json.text;
}
