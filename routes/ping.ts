import { Apalache } from "../utils/apalache.ts";

const config = Deno.env.toObject();

export const handler = {
  async GET(_req: Request): Promise<Response> {
    let [apalacheHostname, apalachePort] = ["localhost", 8822];

    if (config["APALACHE_ENDPOINT"]) {
      const apalacheEndpoint = config["APALACHE_ENDPOINT"];
      const splitIndex = apalacheEndpoint.indexOf(":");
      apalacheHostname = apalacheEndpoint.slice(0, splitIndex);
      apalachePort = parseInt(apalacheEndpoint.slice(splitIndex + 1));
    }

    try {
      const apalache = new Apalache();
      await apalache.setVersion("0.40.7");
      await apalache.setClient(apalacheHostname, apalachePort);
      await apalache.ping();
      return Response.json({ "status": "ok" });
    } catch (e) {
      return Response.json({ "status": e });
    }
  },
};
