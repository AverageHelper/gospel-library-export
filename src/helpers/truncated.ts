/**
 * Truncates the given string with `"..."` if it's longer than `maxLength`
 * characters.
 *
 * @param str The string to truncate.
 * @param maxLength The max length of the readable portion of the final
 *  string.
 * @returns The given string if it is short enough, or the string
 *  truncated to `maxLength` with `"..."` appended to the end.
 */
export function truncated(str: string, maxLength: number): string {
	const ELLIPSES = "...";
	if (maxLength < ELLIPSES.length) return str;

	// See https://stackoverflow.com/a/53637828
	if (str.length > maxLength) {
		return `${str.slice(0, maxLength)}${ELLIPSES}`;
	}
	return str;
}
