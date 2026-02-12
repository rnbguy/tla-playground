import { define } from "../../utils.ts";

export const handler = define.handlers({
  async POST(ctx): Promise<Response> {
    const req = ctx.req;
    const jsonData = await req.json();
    const apalache = ctx.state.apalache;
    if (!apalache) {
      return Response.json({ error: "Apalache server unavailable" }, {
        status: 503,
      });
    }
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
      return Response.json(invariants);
    } else {
      return Response.json([]);
    }
  },
});
