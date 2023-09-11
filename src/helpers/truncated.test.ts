import { describe, expect, test } from "vitest";
import { truncated } from "./truncated.js";

describe("Truncating strings", () => {
	const cases = [
		["", "", 30],
		[" ", " ", 30],
		["  ", "  ", 30],
		["   ", "   ", 30],
		["", "", 3],
		[" ", " ", 3],
		["  ", "  ", 3],
		["   ", "   ", 3],
		["    ", "   ...", 3],
		["", "", 0],
		[" ", " ", 0],
		["  ", "  ", 0],
		["   ", "   ", 0],
		["    ", "    ", 0],
		["", "", -30],
		[" ", " ", -30],
		["  ", "  ", -30],
		["   ", "   ", -30],
		["    ", "    ", -30],
		["Lorem Ipsum", "Lorem Ipsum", 12],
		["Lorem Ipsum", "Lorem Ipsum", 11],
		["Lorem Ipsum", "Lorem Ipsu...", 10],
		["Lorem Ipsum", "Lorem Ips...", 9],
		["Lorem Ipsum", "Lorem Ip...", 8],
		[" Lorem Ipsu", " Lorem Ipsu", 12],
		[" Lorem Ipsu", " Lorem Ipsu", 11],
		[" Lorem Ipsu", " Lorem Ips...", 10],
		[" Lorem Ipsu", " Lorem Ip...", 9],
		[" Lorem Ipsu", " Lorem I...", 8]
	] as const;

	test.each(cases)("transforms '%s' to '%s' (maxLength %d)", (value, result, len) => {
		expect(truncated(value, len)).toBe(result);
	});
});
