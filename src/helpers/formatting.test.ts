import { Bright, Dim, Reset } from "./consoleColors.js";
import { describe, expect, test } from "vitest";
import { header } from "./formatting.js";

describe("String Formatting", () => {
	describe("Header", () => {
		const prefix = `${Dim}**${Reset} ${Bright}`;
		const postfix = `${Reset} ${Dim}**${Reset}`;

		const cases = [
			["", `${prefix}${postfix}`],
			[" ", `${prefix}${postfix}`],
			["  ", `${prefix}${postfix}`],
			["foo", `${prefix}foo${postfix}`],
			[" foo", `${prefix}foo${postfix}`],
			["foo ", `${prefix}foo${postfix}`],
			[" foo ", `${prefix}foo${postfix}`],
			["Lorem Ipsum", `${prefix}Lorem Ipsum${postfix}`],
			["Lorem  Ipsum", `${prefix}Lorem  Ipsum${postfix}`],
			["Lorem Ipsum dolor", `${prefix}Lorem Ipsum dolor${postfix}`]
		] as const;

		test.each(cases)("transforms '%s' to '%s'", (value, result) => {
			expect(header(value)).toBe(result);
		});
	});
});
