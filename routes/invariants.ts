import { Apalache } from "../utils/apalache.ts";

const config = Deno.env.toObject();

export const handler = {
  async POST(req: Request): Promise<Response> {
    const jsonData = await req.json();

    let [apalacheHostname, apalachePort] = ["localhost", 8822];

    if (config["APALACHE_ENDPOINT"]) {
      const apalacheEndpoint = config["APALACHE_ENDPOINT"];
      const splitIndex = apalacheEndpoint.indexOf(":");
      apalacheHostname = apalacheEndpoint.slice(0, splitIndex);
      apalachePort = parseInt(apalacheEndpoint.slice(splitIndex + 1));
    }

    const apalache = new Apalache();
    await apalache.setVersion("0.40.7");
    await apalache.setClient(apalacheHostname, apalachePort);
    const respJson = await apalache.modelTypeCheck(
      jsonData.tla,
    );

    if (respJson.result === "success") {
      const resp = JSON.parse(respJson.success);
      const invariants = resp.modules[0].declarations.filter((
        d: { type: string; name: string },
      ) => d.type === "Bool" || d.type === "(() => Bool)").map((
        d: { name: string },
      ) => d.name).filter((d: string) => d !== "Init" && d !== "Next");
      console.log(invariants);
      return Response.json(invariants);
    } else {
      return Response.json([]);
    }
  },
};
