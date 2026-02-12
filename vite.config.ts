import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

const externalDeps = [
  "protobufjs",
  "protobufjs/ext/descriptor/index.js",
  "@grpc/grpc-js",
  "@grpc/proto-loader",
];

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
    rollupOptions: {
      external: externalDeps,
    },
  },
  ssr: {
    external: externalDeps,
  },
});
