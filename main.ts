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

const apalache = new Apalache();
await apalache.setVersion("latest");
await apalache.getJar();
apalache.spawnServer();

await start(manifest, { plugins: [twindPlugin(twindConfig)] });

apalache.killServer();
