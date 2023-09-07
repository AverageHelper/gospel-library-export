export function isNonEmptyArray<T>(tbd: Array<T>): tbd is NonEmptyArray<T>;

export function isNonEmptyArray<T>(tbd: ReadonlyArray<T>): tbd is ReadonlyNonEmptyArray<T>;

export function isNonEmptyArray<T>(tbd: ReadonlyArray<T>): tbd is NonEmptyArray<T> {
	return tbd.length > 0;
}

declare global {
	/**
	 * An array that always contains at least one element.
	 */
	type NonEmptyArray<T> = [T, ...Array<T>];

	/**
	 * A readonly-array that contains at least one element.
	 */
	type ReadonlyNonEmptyArray<T> = readonly [T, ...ReadonlyArray<T>];
}
