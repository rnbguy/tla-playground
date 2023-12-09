/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

const envVars = Deno.env.toObject();

const FRESH_PORT_ID = parseInt(envVars["FRESH_SERVER_PORT"] || "8000");

await start(manifest, {
  ...config,
  port: FRESH_PORT_ID,
});
