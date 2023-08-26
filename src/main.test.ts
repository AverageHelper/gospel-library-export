import { version as packageVersion } from "./version.js";

const mockParseArgs = vi.fn();
vi.mock("node:util", () => ({ parseArgs: mockParseArgs }));

const mockConsoleInfo = vi.spyOn(console, "info");

describe("Main", () => {
	test("does something", async () => {
		mockParseArgs.mockReturnValue({
			values: {
				version: false
			}
		});
		await import("./main.js");

		expect(mockParseArgs).toHaveBeenCalledOnce();
		expect(mockConsoleInfo).toHaveBeenCalledExactlyOnceWith("TODO: Do something here!");
	});

	test("prints the package version", async () => {
		mockParseArgs.mockReturnValue({
			values: {
				version: true
			}
		});
		await import("./main.js");

		expect(mockParseArgs).toHaveBeenCalledOnce();
		expect(mockConsoleInfo).toHaveBeenCalledExactlyOnceWith(`v${packageVersion}`);
	});
});
