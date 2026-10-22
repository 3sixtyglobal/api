// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * HTTP definition of some context keys.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const HttpContextIdKeys = {
	/**
	 * IP address of the client.
	 */
	IpAddress: "ipAddress",

	/**
	 * User agent of the client.
	 */
	UserAgent: "userAgent",

	/**
	 * Correlation ID of the request.
	 */
	CorrelationId: "correlationId",

	/**
	 * Is this a remote request, will be a random UUID if request arrived through a REST endpoint, otherwise undefined.
	 */
	RemoteRequest: "remoteRequest",

	/**
	 * Public Origin of the request.
	 */
	PublicOrigin: "publicOrigin",

	/**
	 * Local Origin of the request.
	 */
	LocalOrigin: "localOrigin",

	/**
	 * The caller's original tenant ID before an escalated privilege tenant override was applied.
	 * Only present when overrideTenant substitution is active for the current request.
	 */
	OriginalTenant: "originalTenant"
} as const;

/**
 * HTTP definition of some context keys.
 */
export type HttpContextIdKeys = (typeof HttpContextIdKeys)[keyof typeof HttpContextIdKeys];
