import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    external: ["@opencode-ai/plugin", "@opencode-ai/plugin/tool", "@betterspec/core"],
  },
  {
    entry: ["src/setup.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: false,
    splitting: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
    external: ["@betterspec/core"],
  },
]);
