import { Apalache } from "./apalache.ts";

const APALACHE_VERSION = "0.40.7";

type ApalacheEndpoint = {
  host: string;
  port: number;
};

let sharedApalachePromise: Promise<Apalache> | null = null;

function getEndpoint(): ApalacheEndpoint {
  const endpoint = Deno.env.get("APALACHE_ENDPOINT") ?? "localhost:8822";
  const splitIndex = endpoint.indexOf(":");
  if (splitIndex <= 0 || splitIndex === endpoint.length - 1) {
    return { host: "localhost", port: 8822 };
  }

  const host = endpoint.slice(0, splitIndex);
  const port = Number.parseInt(endpoint.slice(splitIndex + 1), 10);
  if (Number.isNaN(port)) {
    return { host: "localhost", port: 8822 };
  }

  return { host, port };
}

async function initSharedApalache(): Promise<Apalache> {
  const apalache = new Apalache();
  const { host, port } = getEndpoint();
  await apalache.setVersion(APALACHE_VERSION);
  await apalache.setClient(host, port);
  return apalache;
}

export function getSharedApalache(): Promise<Apalache> {
  if (!sharedApalachePromise) {
    sharedApalachePromise = initSharedApalache().catch((error) => {
      sharedApalachePromise = null;
      throw error;
    });
  }

  return sharedApalachePromise;
}
