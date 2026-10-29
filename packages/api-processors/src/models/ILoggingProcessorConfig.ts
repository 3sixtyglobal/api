// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the request logging processor.
 */
export interface ILoggingProcessorConfig {
	/**
	 * Include the body objects when logging the information.
	 */
	includeBody?: boolean;

	/**
	 * Show the full base64 content for data, default to abbreviate.
	 */
	fullBase64?: boolean;

	/**
	 * List of property names to obfuscate, can be regex, defaults to password, privateKey,
	 * mnemonic, seed, documentSignature, token and refreshToken.
	 */
	obfuscateProperties?: string[];

	/**
	 * Request URL path prefixes to exclude from logging, defaults to ["/logging"].
	 * Use this to prevent the logging endpoint itself from appearing in its own output.
	 */
	excludePaths?: string[];
}
