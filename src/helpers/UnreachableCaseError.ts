/**
 * An error object that causes TypeScript to complain when instantiated.
 * If perchance something unexpected happens at runtime, the error message
 * describes the unexpected value.
 */
export class UnreachableCaseError extends Error {
	constructor(value: never) {
		super(`Unreachable case: ${JSON.stringify(value)}`);
		this.name = "UnreachableCaseError";
	}
}
