// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Self signed test key for localhost, 127.0.0.1 and ::1, only for use in tests.
 */
export const TEST_TLS_KEY: string = [
	"-----BEGIN PRIVATE KEY-----",
	"MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgv9kOs92MaL7ucLOw",
	"yi+2IzEcykLsDBClyzOC2CJiFfChRANCAARRL8IsZssFnkNquprst4+/Rj7xen4Q",
	"OqRK+qGbuxgy9quBHntuEus+VpcNC6hTZ7/wN0pQAAiZX8xZuNTkEmpM",
	"-----END PRIVATE KEY-----"
].join("\n");

/**
 * Self signed test certificate for localhost, 127.0.0.1 and ::1, only for use in tests.
 */
export const TEST_TLS_CERT: string = [
	"-----BEGIN CERTIFICATE-----",
	"MIIBrzCCAVSgAwIBAgIUTzhtyld962iufcj73MYBUnDmcJEwCgYIKoZIzj0EAwIw",
	"FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAyMjA0MjQwNFoYDzIxMjYwOTI4",
	"MDQyNDA0WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO",
	"PQMBBwNCAARRL8IsZssFnkNquprst4+/Rj7xen4QOqRK+qGbuxgy9quBHntuEus+",
	"VpcNC6hTZ7/wN0pQAAiZX8xZuNTkEmpMo4GBMH8wHQYDVR0OBBYEFFATd1d/ursJ",
	"vgzvZMc5RgdhQQe7MB8GA1UdIwQYMBaAFFATd1d/ursJvgzvZMc5RgdhQQe7MA8G",
	"A1UdEwEB/wQFMAMBAf8wLAYDVR0RBCUwI4IJbG9jYWxob3N0hwR/AAABhxAAAAAA",
	"AAAAAAAAAAAAAAABMAoGCCqGSM49BAMCA0kAMEYCIQCB3TsO7wxdOh74z69xb6Qr",
	"/KD7jzAzlTfX7W/Z9hANEgIhAMjNUELOAolOufNVRu/Fz8HaPY/EOlpfa/4KJn2U",
	"iZdE",
	"-----END CERTIFICATE-----"
].join("\n");
