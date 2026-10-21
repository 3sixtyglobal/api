// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import { generateRestRoutesHealth, tagsHealth } from "./healthRoutes.js";
import { generateRestRoutesInformation, tagsInformation } from "./informationRoutes.js";

/**
 * REST entry points for the information and health services.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "information",
		defaultBaseRoute: "",
		tags: tagsInformation,
		generateRoutes: generateRestRoutesInformation
	},
	{
		name: "health",
		defaultBaseRoute: "",
		tags: tagsHealth,
		generateRoutes: generateRestRoutesHealth
	}
];
