import { default as protobuf } from "protobufjs";

import { Buffer } from "node:buffer";

import * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";

const PROTO_URL =
  "https://github.com/grpc/grpc/raw/master/src/proto/grpc/reflection/v1alpha/reflection.proto";

// Types of the gRPC interface.
type ServerReflectionRequest = { file_containing_symbol: string };
type ServerReflectionResponseSuccess = {
  file_descriptor_response: {
    file_descriptor_proto: Buffer[];
  };
};
type ServerReflectionResponseFailure = {
  error_response: {
    error_code: number;
    error_message: string;
  };
};
export type ServerReflectionResponse =
  | ServerReflectionResponseSuccess
  | ServerReflectionResponseFailure;
type ServerReflectionService = {
  new (url: string, creds: grpc.ChannelCredentials): ServerReflectionService;
  ServerReflectionInfo: () => grpc.ClientDuplexStream<
    ServerReflectionRequest,
    ServerReflectionResponse
  >;
};
type ServerReflectionPkg = {
  grpc: {
    reflection: { v1alpha: { ServerReflection: ServerReflectionService } };
  };
};

const grpcStubOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

let reflectionPackagePromise: Promise<proto.PackageDefinition> | null = null;

function getReflectionPackageDefinition(): Promise<proto.PackageDefinition> {
  if (!reflectionPackagePromise) {
    reflectionPackagePromise = (async () => {
      const response = await fetch(PROTO_URL, {
        signal: AbortSignal.timeout(5000),
      });
      const source = await response.text();
      const protoJson = protobuf.parse(source, grpcStubOptions).root.toJSON();
      return proto.fromJSON(protoJson, grpcStubOptions);
    })().catch((error) => {
      reflectionPackagePromise = null;
      throw error;
    });
  }

  return reflectionPackagePromise;
}

export async function getReflectionClient(
  connectionOption: Deno.ConnectOptions,
): Promise<ServerReflectionService> {
  const packageDefinition = await getReflectionPackageDefinition();
  const reflectionProtoDescriptor = grpc.loadPackageDefinition(
    packageDefinition,
  ) as unknown as ServerReflectionPkg;
  return new reflectionProtoDescriptor.grpc.reflection.v1alpha
    .ServerReflection(
    `${connectionOption.hostname}:${connectionOption.port}`,
    grpc.credentials.createInsecure(),
  );
}
