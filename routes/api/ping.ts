import { Apalache } from "../../utils/apalache.ts";

const APALACHE_VERSION = "0.40.7";

function getEndpoint() {
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

export const handler = {
  async GET(): Promise<Response> {
    try {
      const apalache = new Apalache();
      const { host, port } = getEndpoint();
      await apalache.setVersion(APALACHE_VERSION);
      await apalache.setClient(host, port);
      await apalache.ping();
      return Response.json({ status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ status: "error", message }, { status: 503 });
    }
  },
};
