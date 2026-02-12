import { assertEquals } from "jsr:@std/assert@^1.0.15";
import type { FreshContext } from "fresh";
import type { State } from "../../utils.ts";
import type { Apalache } from "../../utils/apalache.ts";
import { handler } from "./ping.ts";

function createCtx(
  req: Request,
  apalache: Apalache | null,
): FreshContext<State> {
  return {
    req,
    state: {
      apalache,
      requestId: "req-test-ping",
    },
  } as unknown as FreshContext<State>;
}

Deno.test("ping route returns ok with healthy client", async () => {
  const fakeApalache = {
    ping: () => Promise.resolve({}),
  } as unknown as Apalache;

  const req = new Request("http://localhost/api/ping", {
    method: "GET",
  });

  const response = await handler.GET(createCtx(req, fakeApalache));
  const payload = await response.json() as Record<string, unknown>;

  assertEquals(response.status, 200);
  assertEquals(payload.status, "ok");
});
