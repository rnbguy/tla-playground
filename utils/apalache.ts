import { Untar } from "$std/archive/mod.ts";
import { readerFromStreamReader } from "$std/streams/mod.ts";
import { copy } from "$std/streams/copy.ts";
import { getClient, GrpcClient } from "grpc_basic/client.ts";
import { cache } from "cache/mod.ts";

import { default as protobuf } from "protobufjs";
import { default as protobufDescriptor } from "protobufjs/ext/descriptor";

const REFLECTION_PROTO_URL =
  "https://github.com/grpc/grpc/raw/master/src/proto/grpc/reflection/v1alpha/reflection.proto";
const GRPC_REFLECTION_SERVICE_NAME = "grpc.reflection.v1alpha.ServerReflection";

const GH_REPO = "informalsystems/apalache";
const TGZ_JAR_NAME = "apalache.jar";
const APALACHE_SERVICE_NAME = "shai.cmdExecutor.CmdExecutor";

export class Apalache {
  version: string | undefined;
  process: Deno.ChildProcess | undefined;
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

  async getCmdExecutorProto(
    connectOption: Deno.ConnectOptions,
  ): Promise<protobuf.Root> {
    const reflectionProtoFile = await cache(REFLECTION_PROTO_URL);
    const reflectionProto = await Deno.readTextFile(reflectionProtoFile.path);

    const reflectionClient = getClient({
      root: reflectionProto,
      serviceName: GRPC_REFLECTION_SERVICE_NAME,
      ...connectOption,
    });

    const respStream = reflectionClient.ServerReflectionInfo({
      fileContainingSymbol: APALACHE_SERVICE_NAME,
    });

    const resp = await respStream.next();
    respStream.return();
    reflectionClient.close();

    const fileDescriptorProtos = resp.value.fileDescriptorResponse
      .fileDescriptorProto.map((buf) =>
        protobufDescriptor.FileDescriptorProto.decode(
          buf,
        )
      );

    const fileDescriptorSet = protobufDescriptor.FileDescriptorSet.fromObject({
      file: fileDescriptorProtos,
    });

    return protobuf.Root.fromDescriptor(fileDescriptorSet);
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
    const config = Deno.env.toObject();
    const APALACHE_PORT_ID = parseInt(config["APALACHE_SERVER_PORT"] || "8822");

    const command = new Deno.Command("java", {
      args: [
        "-jar",
        this.getJarName(),
        "server",
        `--port=${APALACHE_PORT_ID}`,
      ],
    });

    this.process = command.spawn();
  };
  killServer = () => {
    if (this.process) {
      this.process.kill("SIGINT");
    }
  };

  async setClient(hostname?: string, port?: number) {
    if (port === undefined) {
      const config = Deno.env.toObject();
      const APALACHE_PORT_ID = parseInt(
        config["APALACHE_SERVER_PORT"] || "8822",
      );
      port = APALACHE_PORT_ID;
    }
    this.client = getClient({
      hostname,
      port,
      root: await this.getCmdExecutorProto({ hostname, port }),
      serviceName: APALACHE_SERVICE_NAME,
    });
  }

  async modelCheck(tla: string, inv: string, length: number): Promise<any> {
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
        inv: [inv],
        length,
        tuning: {
          "search.smt.timeout": 3,
          "smt.randomSeed": Math.floor(Math.random() * 0xffffff),
        },
      },
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
