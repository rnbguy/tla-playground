import { Untar } from "https://deno.land/std/archive/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std/streams/mod.ts";
import { copy } from "https://deno.land/std/streams/copy.ts";
import {
  getClient,
  GrpcClient,
} from "https://github.com/rnbguy/deno-grpc/raw/size-overflow-fix/client.ts";

const GH_REPO = "informalsystems/apalache";
const JAR_NAME = "apalache.jar";

export class Apalache {
  version: string | undefined;
  process: Deno.Process | undefined;
  client: GrpcClient | undefined;
  async setVersion(version: string) {
    if (version == "latest") {
      version = await this.getLatestVersion();
    }
    this.version = version;
  }
  async getLatestVersion(): Promise<string> {
    const urlPath = `https://api.github.com/repos/${GH_REPO}/releases/latest`;
    const resp = await (await fetch(urlPath)).json();
    return resp.tag_name;
  }
  getCmdExecutorProtoUrl(): string {
    return `https://github.com/informalsystems/apalache/raw/${this.version}/shai/src/main/protobuf/cmdExecutor.proto`;
  }

  async getCmdExecutorProto(): Promise<string> {
    return await (await fetch(this.getCmdExecutorProtoUrl())).text();
  }

  async getJar() {
    const urlPath =
      `https://github.com/informalsystems/apalache/releases/download/${this.version}/apalache.tgz`;
    const res = await fetch(urlPath);
    const reader = readerFromStreamReader(
      res.body.pipeThrough(new DecompressionStream("gzip")).getReader(),
    );
    const untar = new Untar(reader);

    for await (const entry of untar) {
      if (entry.type === "file" && entry.fileName.endsWith(JAR_NAME)) {
        const file = await Deno.open(JAR_NAME, { create: true, write: true });
        await copy(entry, file);
        file.close();
        break;
      }
    }
  }
  spawnServer = () => {
    this.process = Deno.run({
      cmd: ["java", "-jar", JAR_NAME, "server"],
    });
  };
  killServer = () => {
    if (this.process) {
      this.process.kill("SIGINT");
      this.process.close();
    }
  };

  async setClient() {
    this.client = getClient({
      port: 8822,
      root: await this.getCmdExecutorProto(),
      serviceName: "shai.cmdExecutor.CmdExecutor",
    });
  }

  async check(tlaContent: string): Promise<any> {
    const config = {
      input: {
        source: {
          type: "string",
          content: tlaContent,
          aux: [],
          format: "tla",
        },
      },
      checker: {
        inv: ["Inv"],
        "max-error": 3,
        view: "View",
      },
    };

    const cmd = {
      cmd: this.client.svc.lookup("Cmd").values.CHECK,
      config: JSON.stringify(config),
    };
    const resp = await this.client.run(cmd);
    return resp;
  }
}
