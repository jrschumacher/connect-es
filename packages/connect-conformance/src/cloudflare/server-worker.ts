// Copyright 2021-2023 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createWorkerHandler } from "./handler.js";
import { createRegistry } from "@bufbuild/protobuf";
import { ExecutionContext } from "@cloudflare/workers-types";

import routes from "../routes.js";
import {
  UnaryRequest,
  ServerStreamRequest,
  ClientStreamRequest,
  BidiStreamRequest,
} from "../gen/connectrpc/conformance/v1/service_pb.js";

interface Env {}

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    // We create a new handler for each request to get the config from env.
    //
    // This is not how you would do it in production. Instead, you would
    // create a single handler and use the same config for all requests.
    return createWorkerHandler({
      routes,
      jsonOptions: {
        typeRegistry: createRegistry(
          UnaryRequest,
          ServerStreamRequest,
          ClientStreamRequest,
          BidiStreamRequest,
        ),
      },
    }).fetch(req, env, ctx);
  },
};
