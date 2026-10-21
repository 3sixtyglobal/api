// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Is } from "@3sixty/core";
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { SchemaMigrationFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { Tenant } from "./entities/tenant.js";
import { TenantV0 } from "./entities/tenantV0.js";
import { TenantV1 } from "./entities/tenantV1.js";

/**
 * Initialize the schema for the node tenant processor, including the Tenant 1 to 2 migration
 * step which converts organizationIdLegacy from a pipe-delimited string to an array of ids.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<Tenant>(), () => EntitySchemaHelper.getSchema(Tenant));
	EntitySchemaFactory.register(nameof<TenantV0>(), () => EntitySchemaHelper.getSchema(TenantV0));
	EntitySchemaFactory.register(nameof<TenantV1>(), () => EntitySchemaHelper.getSchema(TenantV1));

	SchemaMigrationFactory.register(`${nameof<Tenant>()}_1_2`, () => ({
		transformEntityProperty: (entity, schema1Property, schema2Property, value) => {
			if (schema2Property.property !== "organizationIdLegacy") {
				return;
			}
			return toOrganizationIdList(value);
		}
	}));
}

/**
 * Convert a stored organizationIdLegacy value to the array shape the current schema declares.
 * Accepts every physical shape a version 1 table can hold: a pipe-delimited string written by
 * 0.10.0 and earlier, a JSON array written by a fresh 0.10.1-next.4+ table, JSON array text left
 * by a partial hand fix, or an already-migrated array. Ids are trimmed, emptied entries are
 * dropped, duplicates are removed, and case is preserved because the values are DIDs.
 * @param value The stored value to convert.
 * @returns The de-duplicated list of ids, or undefined when there are none.
 */
function toOrganizationIdList(value: unknown): string[] | undefined {
	let parts: unknown[];

	if (Is.array(value)) {
		parts = value;
	} else if (Is.stringValue(value) && value.trim().startsWith("[")) {
		try {
			const parsed: unknown = JSON.parse(value);
			parts = Is.array(parsed) ? parsed : [];
		} catch {
			parts = [];
		}
	} else if (Is.stringValue(value)) {
		parts = value.split("|");
	} else {
		parts = [];
	}

	const ids: string[] = [];
	for (const part of parts) {
		const id = Is.stringValue(part) ? part.trim() : "";
		if (id.length > 0 && !ids.includes(id)) {
			ids.push(id);
		}
	}

	return ids.length > 0 ? ids : undefined;
}
