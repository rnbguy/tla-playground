import { HandlerContext } from "$fresh/server.ts";
import { Apalache } from "../../utils/apalache.ts";

export const handler = {
  async POST(req: Request, _ctx: HandlerContext): Promise<Response> {
    const jsonData = await req.json();
    const codeText = jsonData.body;

    const apalache = new Apalache();
    await apalache.setVersion("latest");
    await apalache.setClient();
    const respJson = await apalache.check(codeText);

    return Response.json({ "resp": respJson, "req": jsonData });
  },
};
