import { defineConfig } from "$fresh/server.ts";
import tailwindPlugin from "$fresh/plugins/tailwind.ts";
import tailwindConfig from "./tailwind.config.ts";

export default defineConfig({
  plugins: [tailwindPlugin(tailwindConfig)],
});
