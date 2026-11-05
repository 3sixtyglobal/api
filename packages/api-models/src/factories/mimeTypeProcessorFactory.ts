// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IMimeTypeProcessor } from "../models/server/IMimeTypeProcessor.js";

/**
 * Factory for creating implementation of mime type processor types.
 */
export const MimeTypeProcessorFactory =
	Factory.createFactory<IMimeTypeProcessor>("mime-type-processor");
