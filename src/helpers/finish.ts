/**
 * Exits the process with code `0` (success).
 */
export function finish(): never {
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
}
