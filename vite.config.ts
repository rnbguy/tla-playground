import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    fresh({
      serverEntry: "main.ts",
      clientEntry: "client.ts",
      routeDir: "routes",
      islandsDir: "islands",
    }),
    tailwindcss(),
  ],
  build: {
    minify: false,
  },
});
