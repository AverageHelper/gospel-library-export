import { Bright, Dim, Reset } from "./consoleColors.js";

/**
 * @example
 * ```ts
 * console.info(header("The Great Brown Fox Jumps Over The Lazy Dog"));
 * // ** The Great Brown Fox Jumps Over The Lazy Dog **
 * ```
 *
 * @returns The given string, formatted in such a way that it looks like a header to the console.
 */
export function header<S extends string>(
	str: S
): `${typeof Dim}**${typeof Reset} ${typeof Bright}${S}${typeof Reset} ${typeof Dim}**${typeof Reset}` {
	// ** STUFF **
	return `${Dim}**${Reset} ${Bright}${str}${Reset} ${Dim}**${Reset}`;
}
