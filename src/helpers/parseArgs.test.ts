import { describe, expect, test, vi } from "vitest";
import { version as packageVersion } from "../version.js";

vi.mock("node:util", () => ({
	// Need a default value here, because this gets called on module load
	parseArgs: vi.fn().mockReturnValue({
		values: { version: false }
	})
}));
import { parseArgs as _parseArgs } from "node:util";
const mockParseArgs = _parseArgs as Mock<typeof _parseArgs>;

vi.mock("./finish.js", () => ({ finish: vi.fn() }));
import { finish } from "./finish.js";
const mockFinish = finish as Mock<typeof finish>;

const mockConsoleInfo = vi.spyOn(console, "info");

import { parseArgs } from "./parseArgs.js";

describe("Args parser", () => {
	beforeEach(() => {
		mockParseArgs.mockReturnValue({
			values: { version: false },
			positionals: []
		});
	});

	test("does nothing when version is not requested", () => {
		parseArgs();

		expect(mockParseArgs).toHaveBeenCalledOnce();
		expect(mockConsoleInfo).not.toHaveBeenCalled();
		expect(mockFinish).not.toHaveBeenCalled();
	});

	test("prints the package version if requested", () => {
		mockParseArgs.mockReturnValue({
			values: { version: true },
			positionals: []
		});
		parseArgs();

		expect(mockParseArgs).toHaveBeenCalledOnce();
		expect(mockConsoleInfo).toHaveBeenCalledExactlyOnceWith(`v${packageVersion}`);
		expect(mockFinish).toHaveBeenCalledOnce();
	});
});
