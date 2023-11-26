import { describe, expect, test } from "vitest";
import { parseXml } from "./parseXml.js";

describe("XML Parser", () => {
	const textCases = [
		"foo",
		"Lorem Ipsum",
		"I <3 U",
		"<3",
		"I </3 U",
		"</3",
		"Lorem Ipsum\ndolor sit amet"
	] as const;

	test.each(textCases)("returns '%s' as-is", paragraph => {
		const result = parseXml(paragraph);
		expect(result).toHaveProperty("verseNumber");
		expect(result).toMatchObject({ paragraph, verseNumber: undefined });
	});

	const textTrimCases = [
		[" foo", "foo"],
		["Lorem  Ipsum", "Lorem  Ipsum"],
		["Lorem Ipsum ", "Lorem Ipsum"],
		["I <3 U      ", "I <3 U"],
		["      <3", "<3"],
		["\n<3", "<3"],
		["<3\n", "<3"],
		["\n<3\n", "<3"],
		["      I </3 U\n", "I </3 U"],
		["\n</3", "</3"],
		["Lorem Ipsum\ndolor sit amet\n", "Lorem Ipsum\ndolor sit amet"]
	] as const;

	test.each(textTrimCases)("transforms '%s' to '%s'", (dirty, paragraph) => {
		const result = parseXml(dirty);
		expect(result).toHaveProperty("verseNumber");
		expect(result).toMatchObject({ paragraph, verseNumber: undefined });
	});

	test("separates the paragraph from the verse number", () => {
		const verseNumber = "24";
		const markup = `<p class="verse" data-aid="128398677" id="p${verseNumber}"><span class="verse-number">${verseNumber} </span>And straightway the father of the child cried out, and said with tears, Lord, I believe; help thou mine <a class="study-note-ref" href="#note${verseNumber}a"><sup class="marker">a</sup>unbelief</a>.</p>`;
		const paragraph =
			"And straightway the father of the child cried out, and said with tears, Lord, I believe; help thou mine unbelief.";

		const result = parseXml(markup);
		expect(result).toMatchObject({ paragraph, verseNumber });
	});
});
