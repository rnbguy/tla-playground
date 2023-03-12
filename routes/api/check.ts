import { HandlerContext } from "$fresh/server.ts";
import { Apalache } from "../../utils/apalache.ts";

export const handler = {
  async POST(req: Request, _ctx: HandlerContext): Promise<Response> {
    const jsonData = await req.json();

    const apalache = new Apalache();
    await apalache.setVersion("0.30.5");
    await apalache.setClient();
    const respJson = await apalache.modelCheck(jsonData.tla, jsonData.inv);

    return Response.json({ "resp": respJson });
  },
};
