import { HandlerContext } from "$fresh/server.ts";
import { Apalache } from "../../utils/apalache.ts";

export const handler = {
  async POST(req: Request, _ctx: HandlerContext): Promise<Response> {
    const jsonData = await req.json();

    const apalache = new Apalache();
    await apalache.setVersion("0.30.5");
    await apalache.setClient();
    const respJson = await apalache.modelCheck(jsonData.tla, jsonData.inv);

    let outJson: { [k: string]: any } = {};

    if (respJson.failure) {
      const parsedJson = JSON.parse(respJson.failure.data);
      if (parsedJson.msg) {
        outJson.summary = parsedJson.msg;
      } else {
        if (
          parsedJson.pass_name == "BoundedChecker" &&
          parsedJson.error_data.counterexamples
        ) {
          outJson.summary = "Invariant violated";
          outJson.counterexample = parsedJson.error_data.counterexamples[0]
            .states.map((e) => {
              delete e["#meta"];
              return e;
            });
        } else if (parsedJson.pass_name) {
          outJson.summary = parsedJson.pass_name;
          outJson.error = parsedJson.error_data;
        } else {
          outJson = parsedJson;
        }
      }
    } else {
      outJson.summary = "Verified till 10 steps";
    }

    outJson.timestamp = `Created by Apalache on ${new Date().toUTCString()}`;

    return Response.json(outJson);
  },
};
