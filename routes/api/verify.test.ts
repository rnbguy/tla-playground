import { assertEquals, assertMatch } from "@std/assert";
import type { FreshContext } from "fresh";
import type { State } from "../../utils.ts";
import { handler } from "./verify.ts";
import type { Apalache } from "../../utils/apalache.ts";

function createCtx(
  req: Request,
  apalache: Apalache | null,
): FreshContext<State> {
  return {
    req,
    state: {
      apalache,
      requestId: "req-test-verify",
    },
  } as unknown as FreshContext<State>;
}

Deno.test("verify route returns Apalache description", async () => {
  const fakeApalache = {
    modelCheck: () =>
      Promise.resolve({
        result: "failure",
        failure: {
          errorType: "checker",
          data: JSON.stringify({ msg: "Test failure" }),
        },
      }),
  } as unknown as Apalache;

  const req = new Request("http://localhost/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tla: "---- MODULE X ----\n====", inv: "Init" }),
  });

  const response = await handler.POST(createCtx(req, fakeApalache));
  const payload = await response.json() as Record<string, unknown>;

  assertEquals(response.status, 200);
  assertEquals(payload.result, "Test failure");
  assertMatch(String(payload.description), /Created by Apalache on/);
});

Deno.test("verify route rejects non-json payload", async () => {
  const req = new Request("http://localhost/api/verify", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "invalid",
  });

  const response = await handler.POST(createCtx(req, null));
  assertEquals(response.status, 415);
});
