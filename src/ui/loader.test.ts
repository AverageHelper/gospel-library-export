import { describe, expect, test } from "vitest";
import { loader } from "./loader.js";

describe("loader", () => {
	test("has required methods", () => {
		expect(loader).toHaveProperty("start");
		expect(loader).toHaveProperty("succeed");
		expect(loader).toHaveProperty("stopAndPersist");
	});
});
