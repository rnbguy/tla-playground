/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start, startTls } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

import { Apalache } from "./utils/apalache.ts";

import { loadSync } from "$std/dotenv/mod.ts";

const config = loadSync({ allowEmptyValues: true });

const FRESH_PORT_ID = parseInt(config["FRESH_SERVER_PORT"] || "8000");

const apalache = new Apalache();
await apalache.setVersion("0.30.5");
await apalache.getJar();
apalache.spawnServer();

const keyFile = config["KEY_FILE"];
const certFile = config["CERT_FILE"];

if (keyFile && certFile) {
  console.log("Starting with TLS");
  await startTls(manifest, {
    plugins: [twindPlugin(twindConfig)],
    port: FRESH_PORT_ID,
    keyFile,
    certFile,
  });
} else {
  console.log("Starting without TLS");
  await start(manifest, {
    plugins: [twindPlugin(twindConfig)],
    port: FRESH_PORT_ID,
  });
}

apalache.killServer();
