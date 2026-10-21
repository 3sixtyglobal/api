// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IRestClientProcessor } from "../models/client/IRestClientProcessor.js";

/**
 * Factory for creating implementation of REST client processor types.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const RestClientProcessorFactory =
	Factory.createFactory<IRestClientProcessor>("rest-client-processor");
