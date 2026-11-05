// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IRestRouteProcessor } from "../models/server/IRestRouteProcessor.js";

/**
 * Factory for creating implementation of REST route processor types.
 */
export const RestRouteProcessorFactory =
	Factory.createFactory<IRestRouteProcessor>("rest-route-processor");
