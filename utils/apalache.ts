import { Untar } from "$std/archive/mod.ts";
import { readerFromStreamReader } from "$std/streams/mod.ts";
import { copy } from "$std/streams/copy.ts";
import { getClient, GrpcClient } from "grpc_basic/client.ts";
import { cache } from "cache/mod.ts";

const GH_REPO = "informalsystems/apalache";
const TGZ_JAR_NAME = "apalache.jar";

export class Apalache {
  version: string | undefined;
  process: Deno.Process | undefined;
  client: GrpcClient | undefined;
  async setVersion(version: string) {
    if (version == "latest") {
      version = await this.getLatestVersion();
    }
    this.version = version.replace(/^v/, "");
  }
  async getLatestVersion(): Promise<string> {
    const urlPath = `https://api.github.com/repos/${GH_REPO}/releases/latest`;
    const resp = await (await fetch(urlPath)).json();
    return resp.tag_name;
  }
  getCmdExecutorProtoUrl(): string {
    return `https://github.com/informalsystems/apalache/raw/v${this.version}/shai/src/main/protobuf/cmdExecutor.proto`;
  }

  async getCmdExecutorProto(): Promise<string> {
    const protoFile = await cache(this.getCmdExecutorProtoUrl());
    return Deno.readTextFileSync(protoFile.path);
  }

  getJarName(): string {
    return `apalache-${this.version}.jar`;
  }

  async getJar() {
    const urlPath =
      `https://github.com/informalsystems/apalache/releases/download/v${this.version}/apalache-${this.version}.tgz`;
    const tgzFile = await cache(urlPath);
    const file = await Deno.open(tgzFile.path);
    const reader = readerFromStreamReader(
      file.readable.pipeThrough(new DecompressionStream("gzip")).getReader(),
    );
    const untar = new Untar(reader);

    for await (const entry of untar) {
      if (entry.type === "file" && entry.fileName.endsWith(TGZ_JAR_NAME)) {
        const file = await Deno.open(this.getJarName(), {
          create: true,
          write: true,
        });
        await copy(entry, file);
        file.close();
        break;
      }
    }
  }
  spawnServer = () => {
    this.process = Deno.run({
      cmd: ["java", "-jar", this.getJarName(), "server"],
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

  async modelCheck(tla: string, inv: string): Promise<any> {
    const config = {
      input: {
        source: {
          type: "string",
          content: tla,
          aux: [],
          format: "tla",
        },
      },
      checker: { inv: [inv] },
    };

    const cmd = {
      cmd: this.client.svc.lookup("Cmd").values.CHECK,
      config: JSON.stringify(config),
    };
    const resp = await this.client.run(cmd);
    return resp;
  }

  async modelSimulate(tla: string): Promise<any> {
    const config = {
      input: {
        source: {
          type: "string",
          content: tla,
          aux: [],
          format: "tla",
        },
      },
      checker: {
        max_run: 5,
        output_traces: true,
      },
    };

    const cmd = {
      cmd: this.client.svc.lookup("Cmd").values.SIMULATE,
      config: JSON.stringify(config),
    };
    const resp = await this.client.run(cmd);
    return resp;
  }
}
