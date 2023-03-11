import Playground from "../components/Playground.tsx";
import { PageProps, RouteConfig } from "$fresh/server.ts";

// https://paste.ubuntu.ir
// http://ix.io
// https://bpa.st
// http://ptpb.pw

export const config: RouteConfig = {
  routeOverride: "/*",
};

export default function Body(props: PageProps) {
  return <Playground snippetId={props.params["0"]} />;
}
