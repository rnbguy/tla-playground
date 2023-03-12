/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

import { Apalache } from "./utils/apalache.ts";

import "$std/dotenv/load.ts";

const FRESH_PORT_ID = Deno.env.get("FRESH_SERVER_PORT") ?? 8822;

const apalache = new Apalache();
await apalache.setVersion("0.30.5");
await apalache.getJar();
apalache.spawnServer();

await start(manifest, {
  plugins: [twindPlugin(twindConfig)],
  port: FRESH_PORT_ID,
});

apalache.killServer();
