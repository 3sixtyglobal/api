// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import { generateRestRoutesTenants, tagsTenants } from "./tenantRoutes.js";

/**
 * REST entry points for the tenant administration service.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "tenants",
		defaultBaseRoute: "tenants",
		tags: tagsTenants,
		generateRoutes: generateRestRoutesTenants
	}
];
