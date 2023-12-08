/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import tailwindPlugin from "$fresh/plugins/tailwind.ts";
import tailwindConfig from "./tailwind.config.ts";

const config = Deno.env.toObject();

const FRESH_PORT_ID = parseInt(config["FRESH_SERVER_PORT"] || "8000");

await start(manifest, {
  plugins: [tailwindPlugin(tailwindConfig)],
  port: FRESH_PORT_ID,
});
