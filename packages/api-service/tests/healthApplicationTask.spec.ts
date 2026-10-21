// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HealthStatus, type IHealth } from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ModuleHelper } from "@3sixty/modules";
import {
	healthApplicationTask,
	healthApplicationTaskEnd,
	healthApplicationTaskStart
} from "../src/healthApplicationTask.js";

const ENGINE_CLONE_DATA = { config: {} };
const FILTERED_CLONE_DATA = { config: { types: { loggingConnector: [{ type: "console" }] } } };

describe("healthApplicationTask", () => {
	let mockGetContextIds: ReturnType<typeof vi.fn>;
	let mockGetRegisteredComponents: ReturnType<typeof vi.fn>;
	let mockEngine: {
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		getContextIds: ReturnType<typeof vi.fn>;
		getRegisteredComponents: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.restoreAllMocks();

		mockGetContextIds = vi.fn().mockReturnValue({});
		mockGetRegisteredComponents = vi.fn().mockResolvedValue([]);
		mockEngine = {
			start: vi.fn().mockResolvedValue(undefined),
			stop: vi.fn().mockResolvedValue(undefined),
			getContextIds: mockGetContextIds,
			getRegisteredComponents: mockGetRegisteredComponents
		};

		// The task loads both the clone filter and the engine builder through the module helper,
		// so the mock has to respond per module.
		vi.spyOn(ModuleHelper, "execModuleMethod").mockImplementation(
			async <T>(module: string): Promise<T> =>
				(module === "@3sixty/engine-models" ? FILTERED_CLONE_DATA : mockEngine) as T
		);
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({});
		vi.spyOn(ContextIdStore, "run").mockImplementation(async (contextIds, fn) => fn());
	});

	afterEach(async () => {
		// The task module holds the engine clone in module scope, so clear it
		// between tests to stop one test's engine leaking into the next.
		await healthApplicationTaskEnd();
	});

	test("returns empty array when engineCloneData is empty", async () => {
		expect(await healthApplicationTask(undefined)).toEqual([]);
		expect(await healthApplicationTask(null)).toEqual([]);
		expect(ModuleHelper.execModuleMethod).not.toHaveBeenCalled();
	});

	test("initialises the cloned engine from engineCloneData", async () => {
		await healthApplicationTask(ENGINE_CLONE_DATA);

		expect(ModuleHelper.execModuleMethod).toHaveBeenCalledWith(
			"@3sixty/engine-core",
			"EngineCoreBuilder.fromClone",
			expect.arrayContaining(["engine", ENGINE_CLONE_DATA])
		);
		expect(mockEngine.start).toHaveBeenCalled();
	});

	describe("excludeCloneComponents", () => {
		const CLONE_WITH_TYPES = {
			config: {
				types: {
					loggingConnector: [{ type: "console" }],
					identityComponent: [{ type: "service" }],
					rightsManagementPapComponent: [{ type: "service" }],
					rightsManagementPdpComponent: [{ type: "service" }]
				}
			},
			state: {}
		};

		function cloneArg(): unknown {
			const call = vi
				.mocked(ModuleHelper.execModuleMethod)
				.mock.calls.find(entry => entry[1] === "EngineCoreBuilder.fromClone");
			return call?.[2]?.[1];
		}

		function filterArgs(): unknown[][] {
			return vi
				.mocked(ModuleHelper.execModuleMethod)
				.mock.calls.filter(entry => entry[1] === "EngineCloneHelper.filterCloneComponents")
				.map(entry => entry[2] ?? []);
		}

		test("passes the clone data through untouched when no patterns are supplied", async () => {
			await healthApplicationTaskStart(CLONE_WITH_TYPES);
			expect(filterArgs()).toEqual([]);
			expect(cloneArg()).toBe(CLONE_WITH_TYPES);
		});

		test("passes the clone data through untouched when the pattern list is empty", async () => {
			await healthApplicationTaskStart(CLONE_WITH_TYPES, []);
			expect(filterArgs()).toEqual([]);
			expect(cloneArg()).toBe(CLONE_WITH_TYPES);
		});

		test("delegates the filtering to EngineCloneHelper when patterns are supplied", async () => {
			await healthApplicationTaskStart(CLONE_WITH_TYPES, ["^rightsManagement"]);

			expect(ModuleHelper.execModuleMethod).toHaveBeenCalledWith(
				"@3sixty/engine-models",
				"EngineCloneHelper.filterCloneComponents",
				[CLONE_WITH_TYPES, ["^rightsManagement"]]
			);
		});

		test("builds the clone from the filtered clone data", async () => {
			await healthApplicationTaskStart(CLONE_WITH_TYPES, ["^rightsManagement"]);
			expect(cloneArg()).toBe(FILTERED_CLONE_DATA);
		});

		test("reuses the patterns when the task has to start the engine lazily", async () => {
			await healthApplicationTaskStart(CLONE_WITH_TYPES, ["^rightsManagement"]);
			await healthApplicationTaskEnd();

			vi.mocked(ModuleHelper.execModuleMethod).mockClear();
			await healthApplicationTaskStart(CLONE_WITH_TYPES, ["^rightsManagement"]);
			expect(filterArgs()).toEqual([[CLONE_WITH_TYPES, ["^rightsManagement"]]]);
		});
	});

	test("stops the engine after the health cycle completes", async () => {
		await healthApplicationTask(ENGINE_CLONE_DATA);
		await healthApplicationTaskEnd();
		expect(mockEngine.stop).toHaveBeenCalled();
	});

	test("stops the engine even when the health cycle throws", async () => {
		mockGetRegisteredComponents.mockRejectedValue(new Error("fail"));
		await expect(healthApplicationTask(ENGINE_CLONE_DATA)).rejects.toThrow("fail");
		await expect(healthApplicationTaskEnd()).resolves.toBeUndefined();
		expect(mockEngine.stop).toHaveBeenCalled();
	});

	test("returns empty array when no components are registered", async () => {
		expect(await healthApplicationTask(ENGINE_CLONE_DATA)).toEqual([]);
	});

	test("separates startup, payload execution and teardown lifecycle", async () => {
		await expect(healthApplicationTaskStart(ENGINE_CLONE_DATA)).resolves.toBeUndefined();
		expect(mockEngine.start).toHaveBeenCalledTimes(1);

		await expect(healthApplicationTask(ENGINE_CLONE_DATA)).resolves.toEqual([]);
		await expect(healthApplicationTaskEnd()).resolves.toBeUndefined();
		expect(mockEngine.stop).toHaveBeenCalledTimes(1);
	});

	test("builds a fresh clone when the previous start failed", async () => {
		const failedEngine = {
			...mockEngine,
			start: vi.fn().mockRejectedValue(new Error("startFailed")),
			getRegisteredComponents: vi.fn().mockResolvedValue([])
		};
		vi.mocked(ModuleHelper.execModuleMethod).mockResolvedValueOnce(failedEngine);

		await expect(healthApplicationTaskStart(ENGINE_CLONE_DATA)).rejects.toThrow("startFailed");
		await expect(healthApplicationTask(ENGINE_CLONE_DATA)).resolves.toEqual([]);

		expect(ModuleHelper.execModuleMethod).toHaveBeenCalledTimes(2);
		expect(failedEngine.getRegisteredComponents).not.toHaveBeenCalled();
		expect(mockEngine.start).toHaveBeenCalledTimes(1);
		expect(mockGetRegisteredComponents).toHaveBeenCalledTimes(1);
	});

	test("rejects instead of running the health cycle while the clone start keeps failing", async () => {
		mockEngine.start.mockRejectedValue(new Error("startFailed"));

		await expect(healthApplicationTaskStart(ENGINE_CLONE_DATA)).rejects.toThrow("startFailed");
		await expect(healthApplicationTask(ENGINE_CLONE_DATA)).rejects.toThrow("startFailed");

		expect(ModuleHelper.execModuleMethod).toHaveBeenCalledTimes(2);
		expect(mockGetRegisteredComponents).not.toHaveBeenCalled();
	});

	test("calls healthApplicationInit, healthApplication, healthApplicationTeardown in order", async () => {
		const callOrder: string[] = [];
		mockGetRegisteredComponents.mockResolvedValue([
			{
				component: {
					className: vi.fn().mockReturnValue("MockComponent"),
					healthApplicationInit: vi.fn().mockImplementation(async () => {
						callOrder.push("init");
					}),
					healthApplication: vi.fn().mockImplementation(async () => {
						callOrder.push("application");
						return [];
					}),
					healthApplicationTeardown: vi.fn().mockImplementation(async () => {
						callOrder.push("teardown");
					})
				}
			}
		]);

		await healthApplicationTask(ENGINE_CLONE_DATA);

		expect(callOrder).toEqual(["init", "application", "teardown"]);
	});

	test("calls healthApplicationTeardown in reverse registration order", async () => {
		const teardownOrder: string[] = [];
		mockGetRegisteredComponents.mockResolvedValue(
			["A", "B", "C"].map(name => ({
				component: {
					className: vi.fn().mockReturnValue(name),
					healthApplication: vi.fn().mockResolvedValue([]),
					healthApplicationTeardown: vi.fn().mockImplementation(async () => {
						teardownOrder.push(name);
					})
				}
			}))
		);

		await healthApplicationTask(ENGINE_CLONE_DATA);

		expect(teardownOrder).toEqual(["C", "B", "A"]);
	});

	test("combines engine context IDs with those gathered during init", async () => {
		mockGetContextIds.mockReturnValue({ [ContextIdKeys.Node]: "n1" });
		mockGetRegisteredComponents.mockResolvedValue([
			{
				component: {
					className: vi.fn().mockReturnValue("MockComponent"),
					healthApplicationInit: vi.fn().mockImplementation(async (...args: [IContextIds]) => {
						args[0].session = "s1";
					}),
					healthApplication: vi.fn().mockResolvedValue([])
				}
			}
		]);

		await healthApplicationTask(ENGINE_CLONE_DATA);

		expect(ContextIdStore.run).toHaveBeenCalledWith(
			{ [ContextIdKeys.Node]: "n1", session: "s1" },
			expect.any(Function)
		);
	});

	test("wraps teardown in the same combined context as application health", async () => {
		mockGetContextIds.mockReturnValue({ [ContextIdKeys.Node]: "n1" });
		mockGetRegisteredComponents.mockResolvedValue([
			{
				component: {
					className: vi.fn().mockReturnValue("MockComponent"),
					healthApplicationInit: vi.fn().mockImplementation(async (...args: [IContextIds]) => {
						args[0].session = "s1";
					}),
					healthApplication: vi.fn().mockResolvedValue([]),
					healthApplicationTeardown: vi.fn().mockResolvedValue(undefined)
				}
			}
		]);

		await healthApplicationTask(ENGINE_CLONE_DATA);

		const runCalls = vi.mocked(ContextIdStore.run).mock.calls;
		expect(runCalls).toHaveLength(2);
		expect(runCalls[0][0]).toEqual({ [ContextIdKeys.Node]: "n1", session: "s1" });
		expect(runCalls[1][0]).toEqual({ [ContextIdKeys.Node]: "n1", session: "s1" });
	});

	test("healthApplication runs when component has no healthApplicationInit or healthApplicationTeardown", async () => {
		mockGetRegisteredComponents.mockResolvedValue([
			{
				component: {
					className: vi.fn().mockReturnValue("MockComponent"),
					healthApplication: vi.fn().mockResolvedValue([{ source: "db", status: HealthStatus.Ok }])
				}
			}
		]);

		const result = await healthApplicationTask(ENGINE_CLONE_DATA);

		expect(result[0].source).toBe("db");
	});

	test("returns health entries from healthApplication", async () => {
		const entry: IHealth = { source: "db", status: HealthStatus.Ok };
		mockGetRegisteredComponents.mockResolvedValue([
			{
				component: {
					className: vi.fn().mockReturnValue("MockComponent"),
					healthApplication: vi.fn().mockResolvedValue([entry])
				}
			}
		]);

		const result = await healthApplicationTask(ENGINE_CLONE_DATA);

		expect(result).toEqual([entry]);
	});

	describe("lazy healthApplication (returns undefined, uses callback)", () => {
		test("result from lazy callback is included in the returned health entries", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				{
					component: {
						className: vi.fn().mockReturnValue("MockComponent"),
						healthApplication: vi
							.fn()
							.mockImplementation(async (callback: (r: IHealth[]) => void) => {
								callback([{ source: "lazy", status: HealthStatus.Ok }]);
								return undefined;
							})
					}
				}
			]);

			const result = await healthApplicationTask(ENGINE_CLONE_DATA);

			expect(result.some(r => r.source === "lazy")).toBe(true);
		});

		test("teardown runs after the lazy callback fires", async () => {
			const callOrder: string[] = [];

			mockGetRegisteredComponents.mockResolvedValue([
				{
					component: {
						className: vi.fn().mockReturnValue("MockComponent"),
						healthApplication: vi
							.fn()
							.mockImplementation(async (callback: (r: IHealth[]) => void) => {
								callback([]);
								callOrder.push("callback");
								return undefined;
							}),
						healthApplicationTeardown: vi.fn().mockImplementation(async () => {
							callOrder.push("teardown");
						})
					}
				}
			]);

			await healthApplicationTask(ENGINE_CLONE_DATA);

			expect(callOrder).toEqual(["callback", "teardown"]);
		});

		test("second and subsequent callback invocations are ignored", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				{
					component: {
						className: vi.fn().mockReturnValue("MockComponent"),
						healthApplication: vi
							.fn()
							.mockImplementation(async (callback: (r: IHealth[]) => void) => {
								callback([{ source: "first", status: HealthStatus.Ok }]);
								callback([{ source: "second", status: HealthStatus.Ok }]);
								return undefined;
							})
					}
				}
			]);

			const result = await healthApplicationTask(ENGINE_CLONE_DATA);

			expect(result.some(r => r.source === "first")).toBe(true);
			expect(result.some(r => r.source === "second")).toBe(false);
		});
	});
});
