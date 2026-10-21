// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	HealthApplicationCallback,
	IHealth,
	IHealthProviderComponent
} from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import type { IContextIds } from "@3sixty/context";
import { GeneralError, Is } from "@3sixty/core";
import type { IComponent } from "@3sixty/core";
import { ModuleHelper } from "@3sixty/modules";

let engine:
	| {
			start: () => Promise<void>;
			stop: () => Promise<void>;
			getContextIds: () => IContextIds | undefined;
			getRegisteredComponents: () => Promise<{ instanceType: string; component: IComponent }[]>;
	  }
	| undefined;
let startupPromise: Promise<void> | undefined;
let excludeCloneComponents: string[] | undefined;

/**
 * Start the engine clone used for application health checks.
 * @param engineCloneData The engine clone data supplied automatically by the background task framework.
 * @param excludeComponents Verified regular expression patterns for component types to exclude
 * from the clone, validated by the health service before registration.
 */
export async function healthApplicationTaskStart(
	engineCloneData: unknown,
	excludeComponents?: string[]
): Promise<void> {
	excludeCloneComponents = excludeComponents;

	startupPromise = (async () => {
		if (!Is.empty(engineCloneData)) {
			const cloneData =
				Is.object(engineCloneData) && Is.arrayValue(excludeComponents)
					? await ModuleHelper.execModuleMethod<unknown>(
							"@3sixty/engine-models",
							"EngineCloneHelper.filterCloneComponents",
							[engineCloneData, excludeComponents]
						)
					: engineCloneData;
			const clone = await ModuleHelper.execModuleMethod<{
				start: () => Promise<void>;
				stop: () => Promise<void>;
				getContextIds: () => IContextIds | undefined;
				getRegisteredComponents: () => Promise<{ instanceType: string; component: IComponent }[]>;
			}>("@3sixty/engine-core", "EngineCoreBuilder.fromClone", [
				"engine",
				cloneData,
				await ContextIdStore.getContextIds(),
				{ logLevel: "error" }
			]);
			if (Is.empty(clone)) {
				throw new GeneralError("applicationHealthTask", "engineNotStarted");
			}
			await clone.start();
			engine = clone;
		}
	})();

	try {
		await startupPromise;
	} catch (err) {
		startupPromise = undefined;
		throw err;
	}
}

/**
 * Stop the engine clone used for application health checks.
 */
export async function healthApplicationTaskEnd(): Promise<void> {
	if (!Is.empty(engine)) {
		await engine.stop();
		engine = undefined;
	}
	startupPromise = undefined;
	excludeCloneComponents = undefined;
}

/**
 * Execute the application health lifecycle (init, application, teardown) across all registered
 * components. Called by the background task framework in a worker thread; the engine clone data
 * is used to initialise a local clone of the engine so component factories are available.
 * @param engineCloneData The engine clone data supplied automatically by the background task framework.
 * @returns The health entries collected across all three passes.
 */
export async function healthApplicationTask(engineCloneData: unknown): Promise<IHealth[]> {
	if (Is.empty(engineCloneData)) {
		return [];
	}

	if (startupPromise) {
		try {
			await startupPromise;
		} catch {
			startupPromise = undefined;
		}
	}

	if (Is.empty(engine)) {
		await healthApplicationTaskStart(engineCloneData, excludeCloneComponents);
	}

	return executeApplicationHealthCycle();
}

/**
 * Run the application health lifecycle for each registered provider: initialise shared context,
 * run the health checks, then tear down the per-check context in reverse registration order.
 * @returns The health entries collected for the current application health pass.
 */
async function executeApplicationHealthCycle(): Promise<IHealth[]> {
	if (Is.empty(engine)) {
		throw new GeneralError("applicationHealthTask", "engineNotStarted");
	}

	const engineContextIds = engine.getContextIds() ?? {};
	const registeredInstances = await engine.getRegisteredComponents();

	// Pass 1: Init - providers populate healthContextIds with any IDs they establish
	const healthContextIds: IContextIds = {
		// Only use Node from the main engine context.
		// All other keys should be provided by healthApplicationInit of each component
		// as we don't want to use real ids.
		[ContextIdKeys.Node]: engineContextIds[ContextIdKeys.Node]
	};
	for (const registeredInstance of registeredInstances) {
		if (Is.object<IHealthProviderComponent>(registeredInstance.component)) {
			const initMethod = registeredInstance.component.healthApplicationInit?.bind(
				registeredInstance.component
			);
			if (Is.function(initMethod)) {
				await initMethod(healthContextIds);
			}
		}
	}

	// Pass 2: Application health check wrapped in combined engine + init context
	const allHealth: IHealth[] = [];
	const lazyPromises: Promise<void>[] = [];

	await ContextIdStore.run(healthContextIds, async () => {
		for (const registeredInstance of registeredInstances) {
			if (Is.object<IHealthProviderComponent>(registeredInstance.component)) {
				const healthMethod = registeredInstance.component.healthApplication?.bind(
					registeredInstance.component
				);
				if (Is.function(healthMethod)) {
					let fired = false;
					let callback: HealthApplicationCallback = async () => {};
					const lazyPromise = new Promise<void>(resolve => {
						callback = async (result: IHealth[]) => {
							if (!fired) {
								fired = true;
								allHealth.push(...result);
								resolve();
							}
						};
					});

					const result = await healthMethod(callback);
					// undefined result indicates that the component will provide the
					// result asynchronously via the callback
					if (Is.undefined(result)) {
						lazyPromises.push(lazyPromise);
					} else {
						allHealth.push(...result);
					}
				}
			}
		}
	});

	// Wait for all deferred callbacks before proceeding to teardown
	if (lazyPromises.length > 0) {
		await Promise.allSettled(lazyPromises);
	}

	// Pass 3: Teardown wrapped in combined engine + init context
	await ContextIdStore.run(healthContextIds, async () => {
		for (const registeredInstance of registeredInstances.slice().reverse()) {
			if (Is.object<IHealthProviderComponent>(registeredInstance.component)) {
				const teardownMethod = registeredInstance.component.healthApplicationTeardown?.bind(
					registeredInstance.component
				);
				if (Is.function(teardownMethod)) {
					await teardownMethod();
				}
			}
		}
	});

	return allHealth;
}
