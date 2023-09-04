import type { Mock } from "vitest";
import { version as packageVersion } from "../version.js";

vi.mock("node:util", () => ({
	// Need a default value here, because this gets called on module load
	parseArgs: vi.fn().mockReturnValue({
		values: { version: false }
	})
}));
import { parseArgs as _parseArgs } from "node:util";
const mockParseArgs = _parseArgs as Mock;

vi.mock("./finish.js", () => ({ finish: vi.fn() }));
import { finish } from "./finish.js";
const mockFinish = finish as Mock<[], never>;

const mockConsoleInfo = vi.spyOn(console, "info");

import { parseArgs } from "./parseArgs.js";

describe("Args parser", () => {
	beforeEach(() => {
		mockParseArgs.mockReturnValue({
			values: { version: false }
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
			values: { version: true }
		});
		parseArgs();

		expect(mockParseArgs).toHaveBeenCalledOnce();
		expect(mockConsoleInfo).toHaveBeenCalledExactlyOnceWith(`v${packageVersion}`);
		expect(mockFinish).toHaveBeenCalledOnce();
	});
});
