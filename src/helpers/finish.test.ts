import { spyOn } from "bun:test";

const mockProcessExit = spyOn(process, "exit");

import { finish } from "./finish.js";

describe("Finish process", () => {
	test("ends the process with code 0", () => {
		const benignFinish: () => void = finish; // so TS knows the process won't really end

		benignFinish();
		expect(mockProcessExit).toHaveBeenCalledExactlyOnceWith(0);
	});
});
