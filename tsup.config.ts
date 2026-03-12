import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/plugin.ts"],
  format: ["esm"],
  dts: false, // Enable after @forgelore/core is published
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ["opencode", "@forgelore/core"],
});
