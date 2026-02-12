import { UntarStream } from "@std/tar";
import { type TarStreamEntry } from "@std/tar/untar-stream";
import { cache } from "cache/mod.ts";
import { default as protobufDescriptor } from "protobufjs/ext/descriptor/index.js";
import * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";
import { getReflectionClient, ServerReflectionResponse } from "./reflection.ts";

// const REFLECTION_PROTO_URL =
//   "https://github.com/grpc/grpc/raw/master/src/proto/grpc/reflection/v1alpha/reflection.proto";

const GH_REPO = "informalsystems/apalache";
const TGZ_JAR_NAME = "apalache.jar";
const APALACHE_SERVICE_NAME = "shai.cmdExecutor.CmdExecutor";

type RunRequest = { cmd: string; config: string };
type PingRequest = Record<number, never>;

type RunResponse =
  | { result: "failure"; failure: { errorType: string; data: string } }
  | { result: "success"; success: string };

type PingResponse = Record<number, never>;
type RpcError = grpc.ServiceError | Error | null;
type TarEntryLike = TarStreamEntry & { type?: string; fileName?: string };

type CmdExecutor = {
  new (url: string, creds: grpc.ChannelCredentials): CmdExecutor;
  run: (
    req: RunRequest,
    callback: (err: RpcError, res: RunResponse) => void,
  ) => void;
  ping: (
    req: PingRequest,
    callback: (err: RpcError, res: PingResponse) => void,
  ) => void;
};

type ShaiPkg = {
  shai: {
    cmdExecutor: {
      CmdExecutor: CmdExecutor;
    };
  };
};

const grpcStubOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

export class Apalache {
  version: string | undefined;
  process: Deno.ChildProcess | undefined;
  client: CmdExecutor | undefined;

  async setVersion(version: string) {
    if (version === "latest") {
      version = await this.getLatestVersion();
    }
    this.version = version.replace(/^v/, "");
  }

  async getLatestVersion(): Promise<string> {
    const urlPath = `https://api.github.com/repos/${GH_REPO}/releases/latest`;
    const resp = await (await fetch(urlPath)).json();
    return resp.tag_name;
  }

  getJarName(): string {
    return `apalache-${this.version}.jar`;
  }

  async getJar() {
    const urlPath =
      `https://github.com/informalsystems/apalache/releases/download/v${this.version}/apalache-${this.version}.tgz`;
    const tgzFile = await cache(urlPath);

    for await (
      const entry of (await Deno.open(tgzFile.path))
        .readable
        .pipeThrough(new DecompressionStream("gzip"))
        .pipeThrough(new UntarStream()) as AsyncIterable<TarStreamEntry>
    ) {
      const tarEntry = entry as TarEntryLike;
      if (
        tarEntry.type === "file" &&
        tarEntry.fileName?.endsWith(TGZ_JAR_NAME)
      ) {
        await entry.readable?.pipeTo(
          (await Deno.create(this.getJarName())).writable,
        );
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

    const conn_opt = { hostname: hostname || "localhost", port: port };

    const reflectionClient = await getReflectionClient(conn_opt);

    // Query reflection endpoint (retry if server is unreachable)
    const apalacheProtoDef = await new Promise<
      ServerReflectionResponse
    >(
      (resolve, reject) => {
        const call = reflectionClient.ServerReflectionInfo();
        call.on("data", (r: ServerReflectionResponse) => {
          call.end();
          resolve(r);
        });
        call.on("error", (e: grpc.StatusObject) => reject(e));

        call.write({ file_containing_symbol: APALACHE_SERVICE_NAME });
      },
    ).then(
      (protoDefResponse: ServerReflectionResponse): proto.PackageDefinition => {
        if ("error_response" in protoDefResponse) {
          throw new Error("Failed to resolve Apalache reflection descriptor");
        } else {
          // Decode reflection response to FileDescriptorProto
          const fileDescriptorProtos = protoDefResponse.file_descriptor_response
            .file_descriptor_proto.map(
              (bytes) =>
                protobufDescriptor.FileDescriptorProto.decode(
                  bytes,
                ) as protobufDescriptor.IFileDescriptorProto,
            );

          // Use proto-loader to load the FileDescriptorProto wrapped in a FileDescriptorSet
          const packageDefinition = proto.loadFileDescriptorSetFromObject(
            { file: fileDescriptorProtos },
            grpcStubOptions,
          );

          return packageDefinition;
        }
      },
    );

    const apalacheService = grpc.loadPackageDefinition(
      apalacheProtoDef,
    ) as unknown as ShaiPkg;

    this.client = new apalacheService.shai.cmdExecutor.CmdExecutor(
      `${conn_opt.hostname}:${conn_opt.port}`,
      grpc.credentials.createInsecure(),
    );
  }

  private async runCommand(req: RunRequest): Promise<RunResponse> {
    const client = this.client;
    if (!client) {
      throw new Error("Apalache client not initialized");
    }

    return await new Promise<RunResponse>((resolve, reject) => {
      client.run(req, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  }

  private async pingCommand(req: PingRequest): Promise<PingResponse> {
    const client = this.client;
    if (!client) {
      throw new Error("Apalache client not initialized");
    }

    return await new Promise<PingResponse>((resolve, reject) => {
      client.ping(req, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  }

  async modelCheck(
    tla: string,
    inv: string,
    length: number,
  ): Promise<RunResponse> {
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
      cmd: "CHECK",
      config: JSON.stringify(config),
    };

    return await this.runCommand(cmd);
  }

  async modelTypeCheck(tla: string): Promise<RunResponse> {
    const config = {
      input: {
        source: {
          type: "string",
          content: tla,
          aux: [],
          format: "tla",
        },
      },
    };

    const cmd = {
      cmd: "TYPECHECK",
      config: JSON.stringify(config),
    };

    return await this.runCommand(cmd);
  }

  async modelSimulate(tla: string): Promise<RunResponse> {
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
      cmd: "SIMULATE",
      config: JSON.stringify(config),
    };
    return await this.runCommand(cmd);
  }

  async ping(): Promise<PingResponse> {
    return await this.pingCommand({});
  }
}
