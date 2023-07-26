import { Int32Value, StringValue, MethodKind } from "@bufbuild/protobuf";
import * as http2 from "http2";
import { connectNodeAdapter } from "./connect-node-adapter.js";
import { useNodeServer } from "./use-node-server-helper.spec.js";
import { createConnectTransport } from "./connect-transport.js";
import { createPromiseClient } from "@bufbuild/connect";
import type { HandlerContext } from "@bufbuild/connect";

const TestService = {
  typeName: "handwritten.TestService",
  methods: {
    clientStream: {
      name: "ClientStream",
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.ClientStreaming,
    },
    serverStream: {
      name: "ServerStream",
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.ServerStreaming,
    },
    bidiStream: {
      name: "BidiStream",
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.BiDiStreaming,
    },
  },
} as const;

describe("interactions between universal client and server", function () {
  const output = new StringValue({ value: "123" });
  let serverStream: (
    req: Int32Value,
    context: HandlerContext
  ) => AsyncIterable<StringValue>;
  const server = useNodeServer(() =>
    http2.createServer(
      connectNodeAdapter({
        routes: ({ service }) => {
          service(TestService, {
            serverStream(request, context) {
              return serverStream!(request, context);
            },
          });
        },
      })
    )
  );
  it("signal is aborted if response is closed", async function () {
    let abortTriggered = false;
    let handlerReturned = false;
    serverStream = async function* (request, { signal }) {
      signal.addEventListener("abort", function () {
        abortTriggered = true;
      });
      try {
        for (;;) {
          yield output;
        }
      } finally {
        handlerReturned = false;
      }
    };
    const transport = createConnectTransport({
      baseUrl: server.getUrl(),
      httpVersion: "2",
    });
    const client = createPromiseClient(TestService, transport);
    const res = client.serverStream({ value: 1 });
    const it = res[Symbol.asyncIterator]();
    expect(await it.next()).toEqual({ value: output, done: false });
    expect(it.return).toBeDefined();
    expect(await it.return!()).toEqual({ value: undefined, done: true });
    expect(await it.next()).toEqual({ value: undefined, done: true });
    expect(abortTriggered).toBe(true);
    expect(handlerReturned).toBe(true);
  });
});
