import { expect } from "vitest";
import * as matchers from "jest-extended";
expect.extend(matchers); // Won't work in bun until https://github.com/oven-sh/bun/issues/3621
