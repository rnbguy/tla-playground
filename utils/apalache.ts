import { UntarStream } from "@std/tar";
import { type TarStreamEntry } from "@std/tar/untar-stream";
import { cache } from "cache/mod.ts";
import { promisify } from "node:util";
import { default as protobuf } from "protobufjs";
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
  | { result: "success" };

type PingResponse = Record<number, never>;

type CmdExecutor = {
  new (url: string, creds: grpc.ChannelCredentials): CmdExecutor;
  run: (
    req: RunRequest,
    callback: (err: any, res: RunResponse) => void,
  ) => void;
  ping: (
    req: PingRequest,
    callback: (err: any, res: PingResponse) => void,
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
  protoRoot: protobuf.Root | undefined;

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
      if (entry.type === "file" && entry.fileName.endsWith(TGZ_JAR_NAME)) {
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
    const [apalalcheProtoRoot, apalacheProtoDef]: [
      protobuf.Root,
      proto.PackageDefinition,
    ] = await new Promise<
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
    ).then((protoDefResponse: ServerReflectionResponse) => {
      if ("error_response" in protoDefResponse) {
        return Promise.reject(protoDefResponse);
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

        const fileDescriptorSetMessage = protobufDescriptor.FileDescriptorSet
          .fromObject({
            file: fileDescriptorProtos,
          });

        const protobufRoot = protobuf.Root.fromDescriptor(
          fileDescriptorSetMessage,
        );

        // console.log(protobufRoot.lookupService(APALACHE_SERVICE_NAME));

        return [protobufRoot, packageDefinition];
      }
    });

    this.protoRoot = apalalcheProtoRoot;

    const apalacheService = grpc.loadPackageDefinition(
      apalacheProtoDef,
    ) as unknown as ShaiPkg;

    this.client = new apalacheService.shai.cmdExecutor.CmdExecutor(
      `${conn_opt.hostname}:${conn_opt.port}`,
      grpc.credentials.createInsecure(),
    );
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
      cmd: this.protoRoot?.lookupEnum("Cmd").values.CHECK,
      config: JSON.stringify(config),
    };

    const resp = await promisify((
      data: RunRequest,
      callback: (err: any, res: RunResponse) => void,
    ) => this.client?.run(data, callback))(cmd);
    return resp;
  }

  async modelTypeCheck(tla: string): Promise<any> {
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
      cmd: this.protoRoot?.lookupEnum("Cmd").values.TYPECHECK,
      config: JSON.stringify(config),
    };

    const resp = await promisify((
      data: RunRequest,
      callback: (err: any, res: RunResponse) => void,
    ) => this.client?.run(data, callback))(cmd);
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
      cmd: this.protoRoot?.lookupEnum("Cmd").values.SIMULATE,
      config: JSON.stringify(config),
    };
    const resp = await promisify((
      data: RunRequest,
      callback: (err: any, res: RunResponse) => void,
    ) => this.client?.run(data, callback))(cmd);
    return resp;
  }

  async ping(): Promise<any> {
    const resp = await promisify((
      data: PingRequest,
      callback: (err: any, res: PingResponse) => void,
    ) => this.client?.ping(data, callback))({});
    return resp;
  }
}
