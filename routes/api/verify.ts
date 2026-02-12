import { define } from "../../utils.ts";

const VERIFY_CACHE_TTL_MS = 5_000;
const verifyCache = new Map<
  string,
  { value: Record<string, unknown>; expiresAt: number }
>();

export const handler = define.handlers({
  async POST(ctx): Promise<Response> {
    const req = ctx.req;
    const jsonData = await req.json();

    const bmcLength = 10;
    const apalache = ctx.state.apalache;
    if (!apalache) {
      return Response.json({ error: "Apalache server unavailable" }, {
        status: 503,
      });
    }

    const cacheKey = `${jsonData.tla}::${jsonData.inv}`;
    const cached = verifyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json(cached.value);
    }

    const respJson = await apalache.modelCheck(
      jsonData.tla,
      jsonData.inv,
      bmcLength - 1,
    );

    const outJson: Record<string, unknown> = {};

    if (respJson.result === "failure") {
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
          Object.assign(outJson, parsedJson as Record<string, unknown>);
        }
      }
    } else {
      outJson.result = "Verified";
      outJson.length = bmcLength;
    }

    outJson.description = `Created by Apalache on ${new Date().toUTCString()}`;
    verifyCache.set(cacheKey, {
      value: outJson,
      expiresAt: Date.now() + VERIFY_CACHE_TTL_MS,
    });

    return Response.json(outJson);
  },
});
