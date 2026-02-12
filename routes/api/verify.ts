import { define } from "../../utils.ts";

export const handler = define.handlers({
  async POST(ctx): Promise<Response> {
    const req = ctx.req;
    const jsonData = await req.json();

    const bmcLength = 10;
    const apalache = ctx.state.apalache;
    if (!apalache) {
      return Response.json({ error: "Apalache server unavailable" }, { status: 503 });
    }
    const respJson = await apalache.modelCheck(
      jsonData.tla,
      jsonData.inv,
      bmcLength - 1,
    );

    let outJson: { [k: string]: any } = {};

    if (respJson.failure) {
      const parsedJson = JSON.parse(respJson.failure.data);
      if (parsedJson.msg) {
        outJson.result = parsedJson.msg;
      } else {
        if (
          parsedJson.pass_name === "BoundedChecker" &&
          parsedJson.error_data.counterexamples
        ) {
          outJson.result = "Violated";
          outJson.counterexample = parsedJson.error_data.counterexamples[0]
            .states.map((e: Record<string, unknown>) => {
              delete e["#meta"];
              return e;
            });
        } else if (parsedJson.pass_name) {
          outJson.result = `Error in ${parsedJson.pass_name}`;
          outJson.error = parsedJson.error_data;
        } else {
          outJson = parsedJson;
        }
      }
    } else {
      outJson.result = "Verified";
      outJson.length = bmcLength;
    }

    outJson.description = `Created by Apalache on ${new Date().toUTCString()}`;

    return Response.json(outJson);
  },
});
