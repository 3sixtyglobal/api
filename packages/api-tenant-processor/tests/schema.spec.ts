// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { MigrationHelper, SchemaMigrationFactory } from "@3sixty/entity-storage-models";
import type { IResolvedMigrationStep } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { Tenant } from "../src/entities/tenant.js";
import { initSchema } from "../src/schema.js";

/**
 * Resolve the migration chain from the given stored version to the currently declared Tenant
 * version, the same way SchemaVersionService builds it, then run it.
 * @param entity The entity as stored at fromVersion.
 * @param fromVersion The stored version to migrate from.
 * @returns The entity migrated to the current Tenant version.
 */
async function migrate(entity: unknown, fromVersion: number): Promise<Tenant> {
	const currentVersion = EntitySchemaHelper.getVersion(EntitySchemaFactory.get(nameof<Tenant>()));
	const steps: IResolvedMigrationStep[] = [];

	for (let v = fromVersion; v < currentVersion; v++) {
		const fromSchema = EntitySchemaFactory.get(`${nameof<Tenant>()}V${v}`);
		const toSchema =
			v + 1 < currentVersion
				? EntitySchemaFactory.get(`${nameof<Tenant>()}V${v + 1}`)
				: EntitySchemaFactory.get(nameof<Tenant>());
		const override = SchemaMigrationFactory.getIfExists(`${nameof<Tenant>()}_${v}_${v + 1}`);

		steps.push({
			fromProperties: fromSchema.properties ?? [],
			toProperties: toSchema.properties ?? [],
			renames: override?.renames,
			transformEntity: override?.transformEntity,
			transformEntityProperty: override?.transformEntityProperty,
			removeEntityProperty: override?.removeEntityProperty
		});
	}

	return (await MigrationHelper.applyEntityChain(entity, steps)) as Tenant;
}

describe("schema", () => {
	beforeAll(() => {
		initSchema();
	});

	const baseV1 = {
		id: "01a0d829ad3b7fb2860e372c5464b327",
		apiKey: "01a0d829ad3b7fb2860e372c5464b328",
		label: "Acme",
		dateCreated: "2026-09-01T00:00:00.000Z",
		dateModified: "2026-09-01T00:00:00.000Z",
		organizationId: "did:iota:testnet:0xrenamed"
	};

	test("migrates a stored pipe-delimited organizationIdLegacy to an array of ids", async () => {
		const migrated = await migrate(
			{ ...baseV1, organizationIdLegacy: "|did:iota:testnet:0xA|did:iota:testnet:0xB|" },
			1
		);

		expect(migrated.organizationIdLegacy).toEqual(["did:iota:testnet:0xA", "did:iota:testnet:0xB"]);
	});

	test("keeps an organizationIdLegacy array unchanged", async () => {
		const migrated = await migrate(
			{ ...baseV1, organizationIdLegacy: ["did:iota:testnet:0xA", "did:iota:testnet:0xB"] },
			1
		);

		expect(migrated.organizationIdLegacy).toEqual(["did:iota:testnet:0xA", "did:iota:testnet:0xB"]);
	});

	test("reads organizationIdLegacy stored as JSON array text", async () => {
		const migrated = await migrate(
			{
				...baseV1,
				organizationIdLegacy: '["did:iota:testnet:0xA","did:iota:testnet:0xB"]'
			},
			1
		);

		expect(migrated.organizationIdLegacy).toEqual(["did:iota:testnet:0xA", "did:iota:testnet:0xB"]);
	});

	test("trims, drops empty entries and removes duplicates while keeping case", async () => {
		const migrated = await migrate(
			{ ...baseV1, organizationIdLegacy: "| did:A ||did:A|did:b |" },
			1
		);

		expect(migrated.organizationIdLegacy).toEqual(["did:A", "did:b"]);
	});

	test.each([
		["an empty string", ""],
		["only separators", "||"],
		["undefined", undefined],
		["an empty array", []]
	])("omits organizationIdLegacy when the source has no ids (%s)", async (label, value) => {
		const migrated = await migrate({ ...baseV1, organizationIdLegacy: value }, 1);

		expect(migrated.organizationIdLegacy, label).toBeUndefined();
	});

	test("leaves every other tenant property unchanged", async () => {
		const source = {
			...baseV1,
			publicOrigin: "https://acme.example",
			organizationIdLegacy: "|did:iota:testnet:0xA|"
		};

		const migrated = await migrate(source, 1);

		expect(migrated.id).toEqual(source.id);
		expect(migrated.apiKey).toEqual(source.apiKey);
		expect(migrated.label).toEqual(source.label);
		expect(migrated.dateCreated).toEqual(source.dateCreated);
		expect(migrated.dateModified).toEqual(source.dateModified);
		expect(migrated.publicOrigin).toEqual(source.publicOrigin);
		expect(migrated.organizationId).toEqual(source.organizationId);
	});

	test("produces a tenant that validates against the current schema", async () => {
		const migrated = await migrate(
			{ ...baseV1, organizationIdLegacy: "|did:iota:testnet:0xA|" },
			1
		);

		expect(() =>
			EntitySchemaHelper.validateEntity(migrated, EntitySchemaFactory.get(nameof<Tenant>()))
		).not.toThrow();
	});

	test("migrates a version 0 tenant through to the current version", async () => {
		const sourceV0 = {
			id: "01a0d829ad3b7fb2860e372c5464b327",
			apiKey: "01a0d829ad3b7fb2860e372c5464b328",
			label: "Acme",
			dateCreated: "2026-09-01T00:00:00.000Z",
			dateModified: "2026-09-01T00:00:00.000Z"
		};

		const migrated = await migrate(sourceV0, 0);

		expect(migrated.organizationIdLegacy).toBeUndefined();
		expect(() =>
			EntitySchemaHelper.validateEntity(migrated, EntitySchemaFactory.get(nameof<Tenant>()))
		).not.toThrow();
	});
});
