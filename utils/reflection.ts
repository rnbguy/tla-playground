import { default as protobuf } from "protobufjs";

import { Buffer } from "node:buffer";

import * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";

const PROTO_URL =
  "https://github.com/grpc/grpc/raw/master/src/proto/grpc/reflection/v1alpha/reflection.proto";
// const GRPC_REFLECTION_SERVICE_NAME = "grpc.reflection.v1alpha.ServerReflection";

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

export async function getReflectionClient(
  connectionOption: Deno.ConnectOptions,
): Promise<ServerReflectionService> {
  const response = await fetch(PROTO_URL);
  const protoJson = protobuf.parse(await response.text(), grpcStubOptions).root
    .toJSON();
  const packageDefinition = proto.fromJSON(protoJson, grpcStubOptions);
  // const packageDefinition = proto.loadSync(protoLocalPath, grpcStubOptions);
  const reflectionProtoDescriptor = grpc.loadPackageDefinition(
    packageDefinition,
  ) as unknown as ServerReflectionPkg;
  return new reflectionProtoDescriptor.grpc.reflection.v1alpha
    .ServerReflection(
    `${connectionOption.hostname}:${connectionOption.port}`,
    grpc.credentials.createInsecure(),
  );
}
