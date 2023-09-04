import type { Trim } from "type-fest";
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
): `${typeof Dim}**${typeof Reset} ${typeof Bright}${Trim<S>}${typeof Reset} ${typeof Dim}**${typeof Reset}` {
	// ** STUFF **
	const value = str.trim() as Trim<S>;
	return `${Dim}**${Reset} ${Bright}${value}${Reset} ${Dim}**${Reset}`;
}
