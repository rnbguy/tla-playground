import { HandlerContext } from "$fresh/server.ts";
import { ApalacheClient } from "../../utils/apalache.ts";

export const handler = {
  async POST(req: Request, _ctx: HandlerContext): Promise<Response> {
    const jsonData = await req.json();
    const codeText = jsonData.body;

    const client = new ApalacheClient();
    const respJson = await client.check(codeText);

    return Response.json({ "resp": respJson, "req": jsonData });
  },
};
