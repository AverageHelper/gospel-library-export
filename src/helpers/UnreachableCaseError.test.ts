import { UnreachableCaseError } from "./UnreachableCaseError.js";

describe("UnreachableCaseError", () => {
	test("has an appropriate message", () => {
		const error = new UnreachableCaseError("foo" as never);
		expect(error.name).toBe("UnreachableCaseError");
		expect(error.message).toBe('Unreachable case: "foo"');
	});
});
