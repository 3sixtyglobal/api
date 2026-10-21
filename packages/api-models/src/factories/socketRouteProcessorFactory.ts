// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { ISocketRouteProcessor } from "../models/server/ISocketRouteProcessor.js";

/**
 * Factory for creating implementation of socket route processor types.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SocketRouteProcessorFactory =
	Factory.createFactory<ISocketRouteProcessor>("socket-route-processor");
