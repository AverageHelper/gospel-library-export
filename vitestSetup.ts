import { expect } from "vitest";

// eslint-disable-next-line @typescript-eslint/unbound-method
expect.extend ??= (): void => undefined; // Polyfill for Bun until https://github.com/oven-sh/bun/issues/3621

import * as matchers from "jest-extended";
expect.extend(matchers);
